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
    public maxSpeed: number = 100;

    private stopOnPlanet: Planet = null;
    public stoppedOnPlanet: Planet = null;
    public cursorOnPlanet: Planet = null;
    public mining: number = 0;
    public miningSpeed: number = 0.02;

    protected cursors: Phaser.Input.Keyboard.CursorKeys;
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

        if (this.team.isPlayerTeam) {
            this.cursors = this.scene.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D,
                space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            });
            this.keyMine = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

            this.scene.input.on('pointerdown', (pointer) => {
                if (this.dead > 0) {
                    return;
                }

                const px = this.scene.cameras.main.worldView.x + pointer.x;
                const py = this.scene.cameras.main.worldView.y + pointer.y;
                const direction = GM.pointDirection(this.x, this.y, this.scene.cameras.main.worldView.x + pointer.x, this.scene.cameras.main.worldView.y + pointer.y);
                if (pointer.buttons == 1) {
                    if (this.mining <= 0) {
                        this.direction = direction;
                        this.speed = this.maxSpeed;
                        this.setStoppedOnPlanet(null);

                        const planet = this.planetAtPoint(px, py, 2);
                        if (planet) {
                            this.stopOnPlanet = planet;
                        } else {
                            this.stopOnPlanet = null;
                        }
                    }
                }
                if (pointer.buttons == 2) {
                    if (this.weapon == 'mine') {
                        if (this.charge > this.items[this.weapon].item.fireCost && this.items[this.weapon].amount > 1) {
                            this.charge -= this.items[this.weapon].item.fireCost;
                            this.items[this.weapon].amount -= 1;
                            const bullet = new Mine(this.scene, this, px, py, direction, this.items[this.weapon].item.damage, this.items[this.weapon].item.bulletType);
                            this.scene.addEntity(bullet);
                        }
                    } else if (this.weapon) {
                        if (this.charge > this.items[this.weapon].item.fireCost && this.items[this.weapon].amount > 1) {
                            this.charge -= this.items[this.weapon].item.fireCost;
                            this.items[this.weapon].amount -= 1;
                            const bullet = new Bullet(this.scene, this, px, py, direction, this.items[this.weapon].item.damage, this.items[this.weapon].item.bulletType);
                            this.scene.addEntity(bullet);
                        }
                    } else {
                        const fireCost = 0.19;
                        if (this.charge > fireCost) {
                            this.charge -= fireCost;
                            const laser = new Laser(this.scene, this, px, py, direction);
                            this.scene.addEntity(laser);
                        }
                    }
                }
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

        this.energy -= this.speed * 0.0000025;

        const planet = this.planetAtPoint(this.x, this.y, 3.5);
        if (planet && planet === this.stopOnPlanet) {
            this.speed = 0;
            this.stopOnPlanet = null;
            this.setStoppedOnPlanet(planet);
            if (this.cargo > 0 && this.stoppedOnPlanet.canSell) {
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
                for (const key in this.items) {
                    this.items[key].amount = 0;
                }
                for (const entity of this.scene.entities) {
                    if (entity instanceof Planet) {
                        if (entity.getAllegiance(this.team) > 0.5) {
                            this.image.x = entity.x;
                            this.image.y = entity.y - 10;
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
        if (!this.stoppedOnPlanet || this.cargo <= 0) {
            return;
        }
        if (!amount || amount > this.cargo) {
            amount = this.cargo;
        }
        this.money += this.getSellAmount(amount);
        this.cargo -= amount;
        this.stoppedOnPlanet.resources += amount;
        if (this.stoppedOnPlanet.resources > 100) {
            this.stoppedOnPlanet.resources = 100;
        }
    }

    getSellAmount(amount: number = null): number {
        if (!this.stoppedOnPlanet || this.cargo <= 0) {
            return;
        }
        if (!amount || amount > this.cargo) {
            amount = this.cargo;
        }
        return (100 - this.stoppedOnPlanet.resources) * amount * 300;
    }

    buyItem(item: Item, amount: number) {
        if (item.key == 'cargo-pod') {
            if (this.maxCargo < 6) {
                this.maxCargo += 1;
                this.money -= item.price;
            }
        } else if (item.key == 'energy-pod') {
            if (this.maxEnergy < 6) {
                this.energy += 0.999;
                this.maxEnergy += 1;
                this.money -= item.price;
                this.maxSpeed = 100 + (200 * this.maxEnergy / 5);
            }
        } else if (item.key == 'charge-pod') {
            if (this.maxCharge < 6) {
                this.charge += 0.999;
                this.maxCharge += 1;
                this.money -= item.price;
            }
        } else if (item.key == 'shield') {
            if (this.maxShield < 6) {
                this.shield += 1;
                this.maxShield += 1;
                this.money -= item.price;
            }
        } else {
            if (item.price * amount > this.money) {
                amount = Math.floor(this.money / item.price);
            }
            this.items[item.key].amount += amount;
            this.money -= item.price * amount;
        }
    }

    damage(amount: number, blastDirection: number) {
        if (this.shield > 0) {
            this.shield -= amount;
            this.maxShield = Math.ceil(this.shield);
            if (this.shield < 0) {
                this.energy += this.shield;
                this.shield = 0;
            }
        } else {
            this.energy -= amount;
        }
        if (this.energy <= 0) {
            console.log('Dead', this);
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

                this.energy = this.maxEnergy;

                if (this.stoppedOnPlanet.takeColonistsTimer <= 0) {
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
        this.miningAudio.stop();
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
        if (!this.stoppedOnPlanet) {
            return false;
        }
        return true;
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
        if (this.money < 10000) {
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
        let populateAmount = 100;
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
    }

    invest(tech) {
        if (!this.canInvest()) {
            return;
        }
        let amount = 0.1;
        this.stoppedOnPlanet[tech] += amount;
        if (this.stoppedOnPlanet[tech] > 1) {
            this.stoppedOnPlanet[tech] = 1;
        }
        this.money -= 10000;
        if (tech == 'defence') {
            this.stoppedOnPlanet.maxShield = Math.round(5 * this.stoppedOnPlanet.defence);
            this.stoppedOnPlanet.shield = this.stoppedOnPlanet.maxShield;
        }
    }

    warp(x, y) {
        this.speed = 0;

        this.image.alpha = 0.0;

        setTimeout(() => {
            this.image.alpha = 1.0;
            this.image.x = x;
            this.image.y = y;    
        }, 1000);

        
    }
};
