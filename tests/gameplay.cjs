// Exercise the real ship rules without requiring a browser or Phaser renderer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function compile(file, dependencies = {}) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2015 }
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(code, { module, exports: module.exports, require: name => {
        assert.ok(dependencies[name], `Unexpected dependency ${name}`);
        return { default: dependencies[name] };
    }, console, isFinite });
    return module.exports.default;
}
const GM = compile('app/gm.ts');
class Planet {}
class Projectile { constructor(...args) { this.args = args; } }
const Ship = compile('app/ship.ts', { './gm': GM, './planet': Planet, './bullet': Projectile, './mine': Projectile, './laser': Projectile });
const item = (key, price = 100) => ({ key, price, name: key, fireCost: 0.1, damage: 0.2 });
function fixture() {
    let allegiance = 100;
    const planet = Object.assign(new Planet(), {
        name: 'Home', spacePort: 0.5, defence: 0, resources: 25, takeColonistsTimer: 0,
        getAllegiance: () => allegiance, getTotalPopulationConsumed: () => 3000,
        populations: { quantity: 3000, setAllegianceForTeam: (_, value) => { allegiance = value; } }
    });
    const ship = Object.assign(Object.create(Ship.prototype), {
        team: { isPlayerTeam: true }, speed: 0, cruiseSpeed: 60, maxSpeed: 200,
        energy: 1, maxEnergy: 1, charge: 2, maxCharge: 2, cargo: 0, maxCargo: 1,
        shield: 2, maxShield: 2, shieldsEnabled: true, dead: 0, lives: 3,
        cloaked: false, disrupting: false, mining: 0, money: 500,
        colonists: 0, maxColonists: 1999, stoppedOnPlanet: planet,
        image: { x: 100, y: 100, setVelocity() {}, setVelocityX() {}, setVelocityY() {} }, items: {}
    });
    for (const key of ['torpedo','cargo-pod','energy-pod','charge-pod','shield','cloak','disrupter','warp-drive','anti-bio']) ship.items[key] = { amount: 0, item: item(key) };
    ship.scene = {
        playerShip: ship, enemyShips: [], entities: [], level: { width: 3000, height: 3000, planets: [planet] },
        classic: { investment: 10000, log() {}, update() {}, resetView() {}, visit() {} },
        ui: { updateUi() {}, drawMiniMap() {}, win() {}, lose() {} },
        soundManager: { play() {} }, addEntity(entity) { this.entities.push(entity); }
    };
    return { ship, planet, setAllegiance: value => { allegiance = value; } };
}
const tests = {
    'captains on the same path share planetary allegiance': () => {
        const Population = compile('app/game-objects/entity-types/planet-related-objects/populationObjects/population.ts');
        const green = { teamNumber: 1, color: 0x00ff00 };
        const reds = [{ teamNumber: 2, color: 0xff0000 }, { teamNumber: 3, color: 0xff0000 }];
        const population = new Population({ playerTeam: green, enemyTeams: reds }, null, 0, 100);
        population.setAllegianceForTeam(reds[0], 80);
        assert.equal(population.allegiances[1], 20); assert.equal(population.allegiances[2], 80); assert.equal(population.allegiances[3], 80);
    },
    'bulk upgrades charge for each pod and respect available credit': () => {
        const {ship} = fixture(); ship.buyItem(item('cargo-pod', 200), 10);
        assert.equal(ship.maxCargo, 3); assert.equal(ship.money, 100);
        ship.buyItem(item('cargo-pod', 200), 1); assert.equal(ship.money, 100);
    },
    'trade requires a friendly or neutral inhabited orbit': () => {
        const {ship,setAllegiance} = fixture(); setAllegiance(0);
        ship.buyItem(item('torpedo'), 1); assert.equal(ship.money, 500);
        ship.stoppedOnPlanet = null; ship.buyItem(item('torpedo'), 1); assert.equal(ship.items.torpedo.amount, 0);
    },
    'last round can fire and ammunition cannot go negative': () => {
        const {ship} = fixture(); ship.weapon = 'torpedo'; ship.items.torpedo.amount = 1;
        ship.fireAt(200, 200); ship.fireAt(200, 200);
        assert.equal(ship.items.torpedo.amount, 0); assert.equal(ship.scene.entities.length, 1);
    },
    'stealth blocks weapons and disables protective shields': () => {
        const {ship} = fixture(); ship.cloaked = true; ship.weapon = null;
        ship.fireAt(200,200); assert.equal(ship.scene.entities.length, 0);
        ship.damage(0.4, 0); assert.equal(ship.energy, 0.6);
        const protectedShip = fixture().ship; protectedShip.damage(0.4,0); assert.equal(protectedShip.energy, 0.9);
    },
    'warp is installed equipment, uses charge, and stays inside the galaxy': () => {
        const {ship} = fixture(); ship.items['warp-drive'].amount = 1;
        ship.warp(9999, -999); assert.equal(ship.items['warp-drive'].amount, 1);
        assert.equal(ship.charge, 1); assert.equal(ship.x, 2975); assert.equal(ship.y, 25);
    },
    'neutral planets do not refuel or supply colonists': () => {
        const {ship,planet,setAllegiance} = fixture(); ship.stoppedOnPlanet = null; setAllegiance(50);
        ship.energy = 0.2; ship.setStoppedOnPlanet(planet);
        assert.equal(ship.energy, 0.2); assert.equal(ship.colonists, 0);
    },
    'friendly refuelling is limited by spaceport development': () => {
        const {ship,planet} = fixture(); ship.stoppedOnPlanet = null; ship.maxEnergy = 4; ship.energy = 0.2;
        ship.setStoppedOnPlanet(planet); assert.equal(ship.energy, 2); assert.equal(ship.colonists, 300);
    },
    'investment converts neutral allegiance and cannot charge a full facility': () => {
        const {ship,planet,setAllegiance} = fixture(); ship.money = 30000; setAllegiance(50);
        ship.invest('defence'); ship.invest('defence');
        assert.equal(planet.getAllegiance(), 70); assert.equal(ship.money, 10000);
        planet.defence = 1; ship.invest('defence'); assert.equal(ship.money, 10000);
    },
    'the final destroyed ship ends the game without respawning': () => {
        const {ship} = fixture(); let lost = false;
        ship.lives = 1; ship.shieldsEnabled = false; ship.scene.ui.lose = () => { lost = true; };
        ship.damage(2, 0); assert.equal(ship.lives, 0); assert.equal(lost, true);
        ship.checkDeath(); assert.equal(ship.dead, 100);
    },
    'zero speed stops physics immediately': () => {
        const {ship} = fixture(); let velocity; ship.image.setVelocity = (...args) => { velocity = args; };
        ship.speed = 100; ship.stop(); assert.equal(ship.speed, 0); assert.deepEqual(velocity, [0,0]);
    }
};
for (const [name, test] of Object.entries(tests)) { test(); console.log('PASS', name); }
