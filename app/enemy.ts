import Ship from "./ship";
import DefaultScene from "./scenes/default";
import Team from "./team";
import Planet from "./planet";
import GM from "./gm";
import Bullet from "./bullet";
import ship from "./ship";
import Map = Phaser.Structs.Map;
import Species from "./game-objects/entity-types/planet-related-objects/populationObjects/species";
import { BulletType } from "./bulletTypeEnum";
import Population from "./game-objects/entity-types/planet-related-objects/populationObjects/population";

export enum EnemyState {
    ATTACK_ENEMY,
    ATTACK_PLANET,
    MINE_PLANET,
    EVADING,
    COLONISE,
}

export default class Enemy extends Ship {

    public sheildColor: number = 0xff0000;

    private states: EnemyState[] = [
        EnemyState.ATTACK_ENEMY,
        EnemyState.ATTACK_PLANET,
        EnemyState.MINE_PLANET,
        EnemyState.EVADING,
        EnemyState.COLONISE,
    ];

    private state: EnemyState;
    private framesInstate: number;
    private framesToStateChange: number;

    private minFramesToStateChange = 200;
    private maxFramesToStateChange = 700;

    private framePerAttack = 60;
    private framesSinceAttack = 60;

    private attackRange = 200;
    private damageDirection: number;
    private reenteringBounds: Boolean = false;
    private idealPlanetCount: number;

    constructor(
        scene: DefaultScene,
        team: Team,
        startPlanet: Planet,
        species: Species,
        shipSprite: string,
    ) {
        super(scene, team, startPlanet, species, shipSprite);
        this.idealPlanetCount = 4 + Math.ceil(Math.random() * 6);

        this.changeState();
    }

    update() {
        this.graphics.clear();
        if (this.checkDeath()) return;
        if (this.bounceIfAtEdgeOfMap()) return;

        this.recharge();
        this.lockSpeed();
        this.framesSinceAttack++;

        if (this.framesInstate++ >= this.framesToStateChange) {
            this.changeState();
        }
        switch (this.state) {
            case EnemyState.ATTACK_ENEMY:
                this.tryShootEnemy();
                break;
            case EnemyState.ATTACK_PLANET:
                this.tryShootPlanet();
                break;
            case EnemyState.MINE_PLANET:
                this.tryMinePlanet();
                break;
            case EnemyState.EVADING:
                this.evade();
                break;
            case EnemyState.COLONISE:
                this.colonise();
                break;
        }
        this.drawShield();
    }

    private getOurPlanetCount() {
        const {
            totalHuman,
            totalHumanPlanet,
            totalOrk,
            totalOrkPlanet,
        } = this.scene.ui.getTotalScores();
        return totalOrkPlanet;
    }

    private bounceIfAtEdgeOfMap() {
        let insetDistance = 50;

        if (!this.reenteringBounds
            && this.x <= insetDistance
            || this.x >= this.scene.level.width - insetDistance
            || this.y <= insetDistance
            || this.y >= this.scene.level.height - insetDistance) {

            let centreVariance = 20 + (Math.random() * 50);

            this.direction = GM.pointDirection(
                this.x,
                this.y,
                (this.scene.level.width / 2) + (centreVariance * GM.randomSign()),
                (this.scene.level.height / 2) + (centreVariance * GM.randomSign()));

            this.reenteringBounds = true;
            // console.log('Outside bounds');
            this.move();
        }

        if (this.reenteringBounds
            && this.x >= insetDistance
            && this.x <= this.scene.level.width - insetDistance
            && this.y >= insetDistance
            && this.y <= this.scene.level.height - insetDistance) {
            this.reenteringBounds = false;
        }

        return this.reenteringBounds;
    }

    private changeState() {
        const planetCount = this.getOurPlanetCount();
        let valid = false;
        let stateString = "";
        while (!valid) {
            this.state = this.states[Math.floor(Math.random() * this.states.length)];
            // this.state = this.states[1];
            this.resetFramesInState();

            switch (this.state) {
                case EnemyState.ATTACK_ENEMY:
                    if (planetCount >= this.idealPlanetCount) {
                        valid = true;
                    }
                    stateString = "Attack enemy " + planetCount + " " + this.idealPlanetCount;
                    break;
                case EnemyState.ATTACK_PLANET:
                    if (planetCount >= this.idealPlanetCount) {
                        valid = true;
                    }
                    stateString = "Attack planet " + planetCount + " " + this.idealPlanetCount;
                    break;
                case EnemyState.MINE_PLANET:
                    valid = true;
                    stateString = "Mine planet";
                    break;
                case EnemyState.EVADING:
                    valid = true;
                    stateString = "Evading";
                    break;
                case EnemyState.COLONISE:
                    valid = true;
                    stateString = "Colonise";
                    break;
            }
        }
        console.log(this.team.teamNumber, this.x.toFixed(0), this.y.toFixed(0), "State changed to: " + stateString);
    }

    private resetFramesInState() {
        this.framesInstate = 0;
        this.framesToStateChange =
            this.maxFramesToStateChange -
            (Math.random() * this.minFramesToStateChange);
    }

    private tryShootEnemy() {
        const shipInRange = this.findShipToShoot();
        if (shipInRange) {
            this.shoot(shipInRange);
            this.approach(shipInRange);
        } else {
            this.changeState();
        }
    }

    private tryShootPlanet() {
        const planetInRange = this.findPlanetToShoot();
        if (planetInRange) {
            this.shoot(planetInRange);
            if (this.framesInstate % 100 === 0) {
                this.approach(planetInRange);
            }
        } else {
            if (this.framesInstate % 100 === 0) {
                let closest = {
                    distance: null,
                    direction: null,
                    planet: null,
                };
                for (const planet of this.scene.level.planets) {
                    if (planet.getTotalPopulationConsumed() > 0 && planet.populations.species != this.species) {
                        const distance = GM.pointDistance(this.x, this.y, planet.x, planet.y);
                        const direction = GM.pointDirection(this.x, this.y, planet.x, planet.y);
                        if (!closest.planet || closest.distance > distance) {
                            closest.planet = planet;
                            closest.distance = distance;
                            closest.direction = direction;
                        }
                    }
                }
                if (closest.planet) {
                    this.direction = closest.direction + (Math.random() * 50 - 25);
                    this.speed = this.maxSpeed;
                    if (Math.random() < 0.04) {
                        this.changeState();
                    }
                }
            }
        }
    }

    private tryMinePlanet() {
        const planetInRange = this.findPlanetToMine();
        if (planetInRange) {
            if (this.reachedPlanet(planetInRange)) {
                this.speed = 0;
                this.setStoppedOnPlanet(planetInRange);

                if (!this.mine()) {
                    this.changeState();
                }
            } else {
                this.approach(planetInRange);
            }
        } else {
            this.changeState();
        }
    }

    private approach(target: any) {
        this.direction = GM.pointDirection(this.x, this.y, target.x, target.y) + (Math.random() * 50 - 25);
        this.speed = this.maxSpeed;
        this.move();
    }

    private move() {
        let vx = GM.lengthDirX(this.speed, this.direction);
        let vy = GM.lengthDirY(this.speed, this.direction);

        this.image.setVelocityX(vx);
        this.image.setVelocityY(vy);
    }

    private shoot(target: any) {
        if (GM.pointDistance(this.x, this.y, target.x, target.y) < this.attackRange
            && this.framesSinceAttack >= this.framePerAttack) {
            const direction = GM.pointDirection(this.x, this.y, target.x, target.y);
            const bullet = new Bullet(this.scene, this, target.x, target.y, direction, this.scene.items.items[0].damage, BulletType.torpedo);
            this.scene.addEntity(bullet);
            this.framesSinceAttack = 0;
        }
    }

    private evade() {
        const shipInRange = this.findShipToShoot(900);
        if (shipInRange) {
            this.direction = GM.pointDirection(shipInRange.x, shipInRange.y, this.x, this.y);
            this.speed = this.maxSpeed;
            this.move();
        } else {
            this.changeState();
        }
    }

    private colonise() {
        if (this.framesInstate % 10 === 0) {
            let closest = {
                distance: null,
                direction: null,
                planet: null,
            };
            for (const planet of this.scene.level.planets) {
                if (planet.getTotalPopulationConsumed() <= 0) {
                    const distance = GM.pointDistance(this.x, this.y, planet.x, planet.y);
                    const direction = GM.pointDirection(this.x, this.y, planet.x, planet.y);
                    if (!closest.planet || closest.distance > distance) {
                        closest.planet = planet;
                        closest.distance = distance;
                        closest.direction = direction;
                    }
                }
            }
            if (closest.planet) {
                if (closest.distance < 30) {
                    this.speed = 0;

                    if (closest.planet) {
                        if (Math.random() < 0.08) {
                            let populateAmount = 100;
                            if (closest.planet.populations && !closest.planet.populations.species) {
                                closest.planet.populations.species = this.species;
                            } else if(!closest.planet.populations) {
                                closest.planet.populations = new Population(this.scene, this.species, 0, 100);
                            }
                            closest.planet.populations.quantity += populateAmount;
                            if (!closest.planet.getAllegiance(this.team)) {
                                closest.planet.populations.setAllegianceForTeam(this.team, 100);
                            }
                            this.scene.ui.drawMiniMap();
                        }
                    }
                } else {
                    this.direction = closest.direction;
                    this.speed = this.maxSpeed;
                }
            }
        }
        this.move();
    }

    private mine(): Boolean {
        if (this.stoppedOnPlanet && this.stoppedOnPlanet.canMine) {
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
                    this.mining = 0;
                }
                if (this.cargo + miningAmount > this.maxCargo) {
                    miningAmount = this.maxCargo - this.cargo;
                }
                this.stoppedOnPlanet.resources -= miningAmount;
                this.mining -= miningAmount;
                this.cargo += miningAmount;
                // console.log('Mining...');
                return true;
            } else {
                this.mining = 0;
                // console.log('Mining reached max cargo');
                return false;
            }
        }
        // console.log('Mining finished');
        return false;
    }

    private trackCircular(target: any) {

    }

    damage(amount: number, blastDirection: number) {
        super.damage(amount, blastDirection);
        this.damageDirection = blastDirection;
        this.state = EnemyState.EVADING;
        this.resetFramesInState();
    }

    private findShipToShoot(range: number = 600) {
        let closest = {
            distance: null,
            ship: null,
        };
        for (const ship of this.scene.entities) {
            if (ship instanceof Ship && ship.species != this.species && !ship.cloaked && ship.dead <= 0) {
                const distance = GM.pointDistance(this.x, this.y, ship.x, ship.y);
                if (!closest.ship || closest.distance > distance) {
                    closest.ship = ship;
                    closest.distance = distance;
                }
            }
        }
        if (closest.distance <= range) {
            return closest.ship;
        }
        return null;
    }

    private findPlanetToMine() {
        let closest = {
            distance: null,
            planet: null,
        };
        for (const planet of this.scene.entities) {
            if (planet instanceof Planet
                && !planet.team) {
                const distance = GM.pointDistance(this.x, this.y, planet.x, planet.y);
                if (!closest.planet || closest.distance > distance) {
                    closest.planet = planet;
                    closest.distance = distance;
                }
            }
        }
        return closest.planet;
    }

    private findPlanetToShoot() {
        let closest = {
            distance: null,
            planet: null,
        };
        for (const planet of this.scene.level.planets) {
            if (planet.populations.species && planet.populations.species != this.species) {
                const distance = GM.pointDistance(this.x, this.y, planet.x, planet.y);
                if (!closest.planet || closest.distance > distance) {
                    closest.planet = planet;
                    closest.distance = distance;
                }
            }
        }
        return closest.planet;
    }

    private reachedPlanet(target: Planet): Boolean {
        return GM.pointDistance(this.x, this.y, target.x, target.y) < 20;
    }
}
