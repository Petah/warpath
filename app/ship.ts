import GM from "./gm";
import DefaultScene from "./scenes/default";
import Bullet from "./bullet";
import Entity from "./entity";
import Planet from "./planet";
import Team from "./team";
import { Item } from "./items";
import Laser from "./laser";
import Species from "./game-objects/entity-types/planet-related-objects/populationObjects/species";
import Mine from "./mine";

class ShipItem {
    public amount: number = 0;

    constructor(
        public item: Item,
    ) {
    }
}

interface ItemMap {
    [key: string]: ShipItem;
}

export default class Ship implements Entity {
    id: number;

    public image: Phaser.Physics.Arcade.Image;

    public speed: number = 0;
    public direction: number = 0;
    public maxSpeed: number = 200;
    public cruiseSpeed = 60;
    public lives = 3;
    public shieldsEnabled = true;
    public cloaked = false;
    public infected = false;
    public disrupting = false;
    private previousX: number;
    private previousY: number;

    private stopOnPlanet: Planet = null;
    public stoppedOnPlanet: Planet = null;
    public cursorOnPlanet: Planet = null;
    public mining: number = 0;
    public miningSpeed: number = 0.02;

    protected keyMine: Phaser.Input.Keyboard.Key;

    public money: number = 500;
    public colonists: number = 0;
    public maxColonists: number = 1999;
    public cargo: number = 0;
    public maxCargo: number = 1;
    public energy: number = 1;
    public maxEnergy: number = 1;
    public charge: number = 1;
    public maxCharge: number = 1;
    public rechargeRate: number = 0.0015;
    public shield: number = 1;
    public maxShield: number = 1;
    public weapon: string = null;

    public dead: number = 0;

    public items: ItemMap = {};

    private ellipses: Array<Phaser.Geom.Ellipse>;
    public graphics: Phaser.GameObjects.Graphics;

    public shipWidth: number = 50.0;
    public shipHeight: number = 43.0;

    public shildColor: number = 0x00ff00;
    private miningAudio: Phaser.Sound.BaseSound = null;

    constructor(
        protected scene: DefaultScene,
        public team: Team,
        startPlanet: Planet,
        public species: Species,
        public shipSprite: string,
    ) {
        this.setStoppedOnPlanet(startPlanet);
        this.image = this.scene.physics.add.image(startPlanet.x, startPlanet.y - 10, shipSprite);
        this.image.depth = 200;
        this.image.setCollideWorldBounds(true);
        this.previousX = this.image.x; this.previousY = this.image.y;

        if (this.team.isPlayerTeam) {
            this.keyMine = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

            this.scene.input.on('pointerdown', (pointer) => {
                if (this.dead > 0) {
                    return;
                }

                const px = this.scene.cameras.main.worldView.x + pointer.x;
                const py = this.scene.cameras.main.worldView.y + pointer.y;
                const direction = GM.pointDirection(this.x, this.y, this.scene.cameras.main.worldView.x + pointer.x, this.scene.cameras.main.worldView.y + pointer.y);
                if (pointer.buttons == 1) this.navigate(px, py, this.planetAtPoint(px, py, 2));
                if (pointer.buttons == 2) this.fireAt(px, py);
            });
            this.scene.input.on('pointermove', (pointer) => {
                const px = this.scene.cameras.main.worldView.x + pointer.x;
                const py = this.scene.cameras.main.worldView.y + pointer.y;
                this.setCursorOnPlanet(this.planetAtPoint(px, py));
            });

            // audio
            this.miningAudio = this.scene.sound.add('mining');

            this.scene.input.keyboard.on('keydown_C', (event) => {
                if (this.team.isPlayerTeam) {
                    this.playerMine();
                }
            });
            this.scene.input.keyboard.on('keyup_C', (event) => {
                this.stopMining();
            });
        }

        for (const item of this.scene.items.items) {
            this.items[item.key] = new ShipItem(item);
        }

        this.graphics = this.scene.add.graphics({
            lineStyle: {
                width: 1,
                color: 0xdddddd,
                alpha: 1,
            }
        });
        this.graphics.depth = 400;

        this.ellipses = Array<Phaser.Geom.Ellipse>();
        for (var i = 0; i < 3; i++) {
            this.ellipses.push(new Phaser.Geom.Ellipse(
                this.x,
                this.y,
                this.shipWidth * 0.5,
                this.shipHeight * 0.5));
        }
    }

    update() {
        if (this.checkDeath()) return;

        this.recharge();
        this.lockSpeed();

        let vx = GM.lengthDirX(this.speed, this.direction);
        let vy = GM.lengthDirY(this.speed, this.direction);
        this.image.setVelocityX(vx);
        this.image.setVelocityY(vy);

        const freeSpeed = this.maxEnergy * 20;
        this.energy = Math.min(this.maxEnergy, this.energy + (this.speed <= freeSpeed ? 0.0003 : -(this.speed - freeSpeed) * 0.0000025));
        if (this.energy < 0.15) this.speed = Math.min(this.speed, freeSpeed);
        if (this.cloaked || this.disrupting) {
            this.charge = Math.max(0, this.charge - 0.004);
            if (!this.charge) { this.cloaked = false; this.disrupting = false; }
        }
        this.image.alpha = this.cloaked ? 0.3 : 1;
        const crossed = (this.previousX - 1500) * (this.x - 1500) < 0 || (this.previousY - 1500) * (this.y - 1500) < 0;
        if (crossed) { this.damage(0.5, this.direction); this.scene.classic.log('ALERT > Energy barrier crossed. Hull and shields stressed.'); }
        this.previousX = this.x; this.previousY = this.y;

        const planet = this.planetAtPoint(this.x, this.y, 3.5);
        if (planet && planet === this.stopOnPlanet) {
            this.speed = 0;
            this.stopOnPlanet = null;
            this.setStoppedOnPlanet(planet);
            if (this.cargo > 0 && this.canBuy()) {
                this.scene.ui.showModalSell();
            }
        }

        if (this.keyMine.isDown && this.stoppedOnPlanet && this.stoppedOnPlanet.canMine) {
            if (this.mining <= 0) {
                this.mining = 0.50 + (0.45 * Math.random());
            }
        }

        if (this.mining > 0) {
            if (this.cargo < this.maxCargo) {
                let miningAmount = 0;
                if (this.stoppedOnPlanet.resources > this.miningSpeed) {
                    miningAmount = this.miningSpeed;
                } else if (this.stoppedOnPlanet.resources > 0) {
                    miningAmount = this.stoppedOnPlanet.resources;
                } else {
                    this.stopMining();
                }
                if (this.cargo + miningAmount > this.maxCargo) {
                    miningAmount = this.maxCargo - this.cargo;
                }
                this.stoppedOnPlanet.resources -= miningAmount;
                this.mining -= miningAmount;
                this.cargo += miningAmount;
            } else {
                this.stopMining();
            }
        }

        this.graphics.clear();
        if (this.mining > 0) {
            for (let i = 0; i < 10; i++) {
                const randomRange = this.stoppedOnPlanet.size / 2;
                const line = new Phaser.Geom.Line(
                    this.x,
                    this.y,
                    this.stoppedOnPlanet.x + GM.lengthDirX(Math.random() * randomRange, Math.random() * 360),
                    this.stoppedOnPlanet.y + GM.lengthDirY(Math.random() * randomRange, Math.random() * 360),
                );
                this.graphics.lineStyle(1, 0xffffff, 1); // blue
                this.graphics.strokeLineShape(line);
            }
        }

        this.drawShield();
    }

    drawShield() {
        if (!this.shieldsEnabled || this.cloaked || this.mining > 0) return;
        for (let i = this.ellipses.length - 1; i >= 0; i--) {
            if (i >= this.maxShield) {
                continue;
            }
            let color = 0x00ff00;
            if (i == 0) {
                color = this.getShieldColor(this.shield % 1);
            }
            const ellipse = this.ellipses[i];
            const h_padding = 33.0;
            const v_padding = 30.0;
            const randomRange = 3.0;
            ellipse.setTo(
                this.x + (Math.random() * randomRange * 2.0 - randomRange),
                this.y + (Math.random() * randomRange * 2.0 - randomRange),
                this.shipWidth * 0.5 + h_padding + (Math.random() * randomRange * 2.0 - randomRange),
                this.shipHeight * 0.5 + v_padding + (Math.random() * randomRange * 2.0 - randomRange),
            );
            this.graphics.lineStyle(1, color, 1);
            this.graphics.strokeEllipseShape(ellipse);
        }
    }

    slowUpdate() {

    }

    protected checkDeath(): Boolean {
        if (this.lives <= 0) return true;
        if (this.dead > 0) {
            this.dead--;
            if (this.dead <= 0) {
                this.image.alpha = 1;
                this.energy = 1;
                this.maxEnergy = 1;
                this.charge = 1;
                this.maxCharge = 1;
                this.shield = 1;
                this.maxShield = 1;
                this.cargo = 0; this.maxCargo = 1; this.colonists = 0;
                this.weapon = null; this.shieldsEnabled = true; this.infected = false;
                for (const key in this.items) {
                    this.items[key].amount = 0;
                }
                for (const entity of this.scene.entities) {
                    if (entity instanceof Planet) {
                        if (entity.getAllegiance(this.team) > 66) {
                            this.image.x = entity.x;
                            this.image.y = entity.y - 10;
                            this.previousX = this.image.x; this.previousY = this.image.y;
                            this.setStoppedOnPlanet(entity);
                            break;
                        }
                    }
                }
            }
            return true;
        }
        return false;
    }

    protected recharge() {
        this.charge += this.rechargeRate + (0.0025 * this.maxCharge / 5);
        if (this.charge > this.maxCharge) {
            this.charge = this.maxCharge;
        }
    }

    protected lockSpeed() {
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < 0) {
            this.speed = 0;
        }
    }

    private getShieldColor(amount) {
        amount = Math.ceil(amount * 5);
        switch (amount) {
            case 1:
                return 0xFF0000;
            case 2:
                return 0xFF7700;
            case 3:
                return 0xFFFF00;
            case 4:
                return 0x77FF00;
            case 5:
                return 0x00FF00;
        }
        return 0x00FF00;
    }

    private planetAtPoint(x: number, y: number, size: number = 1) {
        const closest = {
            planet: null,
            distance: null,
        };
        for (const planet of this.scene.level.planets) {
            const distance = GM.pointDistance(x, y, planet.x, planet.y);
            if (distance < (15 * size) && (closest.distance === null || distance < closest.distance)) {
                closest.planet = planet;
                closest.distance = distance;
            }
        }
        return closest.planet;
    }

    sell(amount: number = null) {
        if (!this.canBuy() || this.cargo <= 0) {
            return 0;
        }
        if (!amount || amount > this.cargo) {
            amount = this.cargo;
        }
        this.money += this.getSellAmount(amount);
        this.cargo -= amount;
        this.scene.classic.log('Trading post > Sold ' + Math.round(amount * 1000) + ' tons of ore.');
        this.stoppedOnPlanet.resources += amount;
        if (this.stoppedOnPlanet.resources > 100) {
            this.stoppedOnPlanet.resources = 100;
        }
    }

    getSellAmount(amount: number = null): number {
        if (!this.canBuy() || this.cargo <= 0) {
            return 0;
        }
        if (!amount || amount > this.cargo) {
            amount = this.cargo;
        }
        return (100 - this.stoppedOnPlanet.resources) * amount * 300;
    }

    buyItem(item: Item, amount: number) {
        if (!this.canBuy() || !isFinite(amount) || amount <= 0) return;
        amount = Math.min(Math.floor(amount), Math.floor(this.money / item.price));
        const capacities = { 'cargo-pod': 'maxCargo', 'energy-pod': 'maxEnergy', 'charge-pod': 'maxCharge', shield: 'maxShield' };
        const capacity = capacities[item.key];
        if (capacity) amount = Math.min(amount, 6 - this[capacity]);
        if (['cloak', 'disrupter', 'warp-drive'].indexOf(item.key) >= 0) amount = Math.min(amount, 1 - this.items[item.key].amount);
        if (amount <= 0) { this.scene.classic.log('Trading post > Insufficient credits, or equipment already at capacity.'); return; }
        if (capacity) {
            this[capacity] += amount;
            if (item.key == 'energy-pod') this.energy += amount;
            if (item.key == 'charge-pod') this.charge += amount;
            if (item.key == 'shield') this.shield += amount;
        } else this.items[item.key].amount += amount;
        this.money -= item.price * amount;
        this.scene.classic.log('Trading post > Bought ' + amount + ' × ' + item.name + '.');
        this.scene.ui.updateUi();
    }

    damage(amount: number, blastDirection: number) {
        if (this.dead > 0 || this.lives <= 0) return;
        if (this.team.isPlayerTeam) this.scene.classic.resetView();
        const disruptors = [this.scene.playerShip].concat(this.scene.enemyShips).filter(ship => ship.disrupting && Math.floor(ship.x/600) === Math.floor(this.x/600) && Math.floor(ship.y/600) === Math.floor(this.y/600)).length;
        const layers = this.shieldsEnabled && !this.cloaked && this.mining <= 0 ? Math.floor(Math.ceil(this.shield) / Math.pow(2, disruptors)) : 0;
        this.energy -= amount / Math.pow(2, layers);
        if (layers > 0) { this.shield = Math.max(0, this.shield - amount * 0.1); this.maxShield = Math.ceil(this.shield); }
        if (this.energy <= 0) {
            this.lives--;
            this.setStoppedOnPlanet(null);
            this.stopOnPlanet = null;
            this.stopMining();
            this.cloaked = false; this.disrupting = false;
            if (this.team.isPlayerTeam) {
                this.scene.classic.log('ALERT > Ship destroyed. ' + this.lives + ' ships remaining.');
                if (this.lives <= 0) this.scene.ui.lose();
            }
            this.dead = 100;
            this.speed = 0;
            this.image.alpha = 0;
            this.image.setVelocityX(0);
            this.image.setVelocityY(0);
        }
    }

    get x() {
        return this.image.x;
    }

    get y() {
        return this.image.y;
    }

    setStoppedOnPlanet(value: Planet) {
        if (value != this.stoppedOnPlanet) {
            if (this.stoppedOnPlanet != null) {
                this.stoppedOnPlanet.isShipStopped = false;
            }
            this.stoppedOnPlanet = value;
            if (value != null) {
                value.isShipStopped = true;
                if (value.sickness > 0) this.infected = true;
                else if (this.infected && value.getTotalPopulationConsumed() > 0) value.sickness = 10;

                if (value.getAllegiance(this.team) > 66) this.energy = Math.max(this.energy, this.maxEnergy * value.spacePort);
                if (this.team.isPlayerTeam && this.scene.classic && this.scene.playerShip) this.scene.classic.visit(value);

                if (value.getAllegiance(this.team) > 66 && this.stoppedOnPlanet.takeColonistsTimer <= 0) {
                    let takeColonistsAmount = Math.floor(this.stoppedOnPlanet.getTotalPopulationConsumed() / 10);
                    if (this.colonists + takeColonistsAmount > this.maxColonists) {
                        takeColonistsAmount = this.maxColonists - this.colonists;
                    }
                    this.colonists += takeColonistsAmount;
                    this.stoppedOnPlanet.populations.quantity -= takeColonistsAmount;
                    this.stoppedOnPlanet.takeColonistsTimer = 200;
                }
            }
        }
    }

    setCursorOnPlanet(value: Planet) {
        if (value != this.cursorOnPlanet) {
            if (this.cursorOnPlanet != null) {
                this.cursorOnPlanet.isCursorOn = false;
            }
            if (value != null) {
                value.isCursorOn = true;
            }
            this.cursorOnPlanet = value;
        }
    }

    stopMining() {
        this.mining = 0;
        if (this.miningAudio) this.miningAudio.stop();
    }

    canMine() {
        if (this.stoppedOnPlanet && this.stoppedOnPlanet.canMine) {
            if (this.cargo < this.maxCargo) {
                if (this.mining <= 0) {
                    return true;
                }
            }
        }
        return false;
    }

    canPopulate() {
        return this.stoppedOnPlanet != null && this.colonists >= 200 &&
            (!this.stoppedOnPlanet.getTotalPopulationConsumed() || this.stoppedOnPlanet.getAllegiance(this.team) > 66);
    }

    canBuy() {
        if (!this.stoppedOnPlanet) {
            return false;
        }
        if (this.stoppedOnPlanet.getAllegiance(this.team) <= 33) {
            return false;
        }
        return true;
    }

    canInvest() {
        if (!this.stoppedOnPlanet) {
            return false;
        }
        if (this.stoppedOnPlanet.getAllegiance(this.team) <= 33) {
            return false;
        }
        if (this.money < (this.scene.classic ? this.scene.classic.investment : 10000)) {
            return false;
        }
        return true;
    }

    playerMine() {
        if (this.canMine()) {
            this.miningAudio.play();
            this.mining = 1.01;
        }
    }

    populatePlanet() {
        if (!this.canPopulate()) {
            return;
        }
        let populateAmount = Math.max(200, Math.floor(this.colonists / 2));
        if (populateAmount > this.colonists) {
            populateAmount = this.colonists;
        }
        if (!this.stoppedOnPlanet.populations.species) {
            this.stoppedOnPlanet.populations.species = this.species;
        }
        this.stoppedOnPlanet.populations.quantity += populateAmount;
        this.colonists -= populateAmount;
        if (!this.stoppedOnPlanet.getAllegiance(this.team)) {
            this.stoppedOnPlanet.populations.setAllegianceForTeam(this.team, 100);
        }
        this.scene.ui.drawMiniMap();
        this.scene.classic.log('Colony > Delivered ' + populateAmount + ' colonists to ' + this.stoppedOnPlanet.name + '.');
    }

    invest(tech) {
        if (!this.canInvest()) {
            return;
        }
        if (['defence','education','industry','mining','spacePort','agriculture'].indexOf(tech) < 0) return;
        if (this.stoppedOnPlanet[tech] >= 1) { this.scene.classic.log('Investment > This facility is fully developed.'); return; }
        const cost = this.scene.classic.investment;
        this.stoppedOnPlanet[tech] = Math.min(1, this.stoppedOnPlanet[tech] + cost / 100000);
        this.money -= cost;
        const allegiance = this.stoppedOnPlanet.getAllegiance(this.team) || 0;
        this.stoppedOnPlanet.populations.setAllegianceForTeam(this.team, Math.min(100, allegiance + cost / 1000));
        if (this.stoppedOnPlanet.getAllegiance(this.team) > 66) this.stoppedOnPlanet.team = this.team;
        if (tech == 'defence') {
            this.stoppedOnPlanet.maxShield = Math.round(5 * this.stoppedOnPlanet.defence);
            this.stoppedOnPlanet.shield = this.stoppedOnPlanet.maxShield;
        }
        this.scene.ui.drawMiniMap(); this.scene.ui.updateUi();
        this.scene.classic.log('Investment > ' + cost.toLocaleString() + ' credits invested on ' + this.stoppedOnPlanet.name + '.');
        const inhabited = this.scene.level.planets.filter(p => p.getTotalPopulationConsumed() > 0);
        if (inhabited.length && inhabited.every(p => p.getAllegiance(this.team) > 66)) this.scene.ui.win();
    }

    navigate(x: number, y: number, planet: Planet = null) {
        if (this.dead > 0) return;
        this.stopMining();
        this.setStoppedOnPlanet(null);
        this.stopOnPlanet = planet;
        this.direction = GM.pointDirection(this.x, this.y, x, y);
        this.speed = this.cruiseSpeed || 60;
        this.scene.classic.log(planet ? 'Helm > Course set for ' + planet.name + '.' : 'Helm > New course set.');
    }

    stop() { this.speed = 0; this.stopOnPlanet = null; this.image.setVelocity(0, 0); this.stopMining(); }
    adjustSpeed(notches: number) { this.cruiseSpeed = Math.max(0, Math.min(this.maxSpeed, (this.speed || this.cruiseSpeed) + notches * 20)); this.stopMining(); this.setStoppedOnPlanet(null); this.speed = this.cruiseSpeed; this.scene.classic.update(); }
    reverse() { this.direction = (this.direction + 180) % 360; this.stopOnPlanet = null; this.setStoppedOnPlanet(null); this.speed = this.cruiseSpeed; this.stopMining(); }

    fireAt(x: number, y: number) {
        if (this.dead > 0 || this.cloaked) return;
        const direction = GM.pointDirection(this.x, this.y, x, y);
        if (!this.weapon) {
            if (this.charge < 0.19) return;
            this.charge -= 0.19;
            this.scene.addEntity(new Laser(this.scene, this, x, y, direction));
            return;
        }
        const stock = this.items[this.weapon];
        if (!stock || stock.amount < 1 || this.charge < stock.item.fireCost) { this.scene.classic.log('Weapons > Out of ammunition or insufficient charge.'); return; }
        this.charge -= stock.item.fireCost; stock.amount--;
        if (this.weapon === 'bio') {
            const planet = this.planetAtPoint(x, y, 2);
            if (planet && GM.pointDistance(this.x,this.y,planet.x,planet.y) < 600) planet.sickness = Math.min(100, planet.sickness + 50);
            this.scene.soundManager.play('plague');
        } else if (this.weapon === 'mine') this.scene.addEntity(new Mine(this.scene, this, x, y, direction, stock.item.damage, stock.item.bulletType));
        else this.scene.addEntity(new Bullet(this.scene, this, x, y, direction, stock.item.damage, stock.item.bulletType));
    }

    toggleEquipment(key: string) {
        if (!this.items[key].amount) { this.scene.classic.log('Equipment > Buy this device at a trading post first.'); return; }
        if (key === 'cloak') { this.cloaked = !this.cloaked; this.scene.soundManager.play(this.cloaked ? 'stealth-on' : 'stealth-off'); }
        if (key === 'disrupter') { this.disrupting = !this.disrupting; this.scene.soundManager.play(this.disrupting ? 'disrupter-on' : 'disrupter-off'); }
    }
    curePlague() {
        if (!this.items['anti-bio'].amount) { this.scene.classic.log('Medical > Buy an antibody crystal first.'); return; }
        this.items['anti-bio'].amount--; this.infected = false;
        this.scene.level.planets.forEach(planet => { if (Math.floor(planet.x/600) === Math.floor(this.x/600) && Math.floor(planet.y/600) === Math.floor(this.y/600)) planet.sickness = 0; });
        this.scene.soundManager.play('antibio'); this.scene.classic.log('Medical > Sector sterilized.');
    }
    warp(x: number, y: number) {
        if (!this.items['warp-drive'].amount || this.charge < 1) { this.scene.classic.log('Warp > Requires an installed drive and one unit of charge.'); return; }
        this.charge -= 1;
        this.stop(); this.setStoppedOnPlanet(null);
        this.image.x = Math.max(25, Math.min(this.scene.level.width - 25, x));
        this.image.y = Math.max(25, Math.min(this.scene.level.height - 25, y));
        this.previousX = this.x; this.previousY = this.y;
        this.scene.classic.log('Warp > Jump complete.');
    }
};
