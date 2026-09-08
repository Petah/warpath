import DefaultScene from "./scenes/default";
import Entity from "./entity";
import PlanetType from "./game-objects/entity-types/planet-related-objects/planetType";
import Population from "./game-objects/entity-types/planet-related-objects/populationObjects/population";
import Level from "./level";
import GM from "./gm";
import Ship from "./ship";
import Bullet from "./bullet";
import Team from "./team";
import PopulationFactory from "./game-objects/entity-types/planet-related-objects/populationObjects/populationFactory";
import { BulletType } from "./bulletTypeEnum";

export default class Planet implements Entity {
    private image: Phaser.Physics.Arcade.Sprite;
    private maxPopulation: number;

    public maxMining: number;
    public maxSpacePort: number;
    public maxIndustry: number;
    public maxAgriculture: number;
    public maxDefence: number;
    public maxEducation: number;
    public maxInfastrucutre: number;
    public maxHealth: number;
    public team: Team = null;

    public planetType: PlanetType;
    public isShipStopped: boolean = false;
    public isCursorOn: boolean = false;

    private circle: Phaser.Geom.Circle;
    private rectangles: Array<Phaser.Geom.Rectangle>;
    private graphics: Phaser.GameObjects.Graphics;
    private planetScale: number;
    private planetSize: number;
    private nameText: Phaser.GameObjects.Text;

    public sickness: number = 0;
    private distressReported = false;

    public attackRange = 200;
    public attackPower = 200;

    public shield: number = 0;
    public maxShield: number = 0;

    private framesPerAttack = 60;
    private framesSinceAttack = 60;

    public takeColonistsTimer: number = 0;

    constructor(
        public scene: DefaultScene,
        public name: string,
        public x: number,
        public y: number,
        // infrastructure
        public mining: number,
        public spacePort: number,
        public industry: number,
        public agriculture: number,
        public defence: number,
        public education: number,
        public populations: Population,
        public health: number,
        public money: number,
        public resources: number,
        public food: number,
        public size: number,
        public type: PlanetType,
        private populationFactory: PopulationFactory,
        public sectorNumber: number,
    ) {
        this.planetSize = size;
        this.planetScale = size / 74.0;
        this.planetType = type;

        this.nameText = this.scene.add.text(x + 15, y + 15, "");
        this.image = this.scene.physics.add
            .staticSprite(this.x, this.y, this.spriteNameFor(this.planetType))
            .setScale(this.planetScale, this.planetScale);

        this.image.depth = 100;
        this.image.play(this.animationNameFor(this.planetType));

        this.scene.physics.world.step(0);

        this.graphics = this.scene.add.graphics({
            lineStyle: {
                width: 1,
                color: 0xdddddd,
            }
        });
        this.circle = new Phaser.Geom.Circle(this.x - 1, this.y - 1, size * 0.5 + 1);
        this.rectangles = Array<Phaser.Geom.Rectangle>();
        for (let i = 0; i < 3; i++) {
            this.rectangles.push(new Phaser.Geom.Rectangle(this.x - size * 0.5, this.y - size * 0.5, size, size));
        }

        this.createMaxPopulationLimit();
        this.createInfrastructureLimits();

        this.populations = populationFactory.generatePopulationForPlanet(this);
    }

    update() {
        this.takeColonistsTimer -= 1;

        this.graphics.clear();

        const color = this.getPlanetColorHex(this.scene.playerShip.team);
        const colorText = this.getPlanetColor(this.scene.playerShip.team);

        this.framesSinceAttack++;

        // circle
        this.graphics.lineStyle(1, color);
        this.graphics.strokeCircleShape(this.circle);

        // text
        if (this.isShipStopped || this.isCursorOn) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(
                this.x,
                this.y,
                this.x + 15,
                this.y + 15));
            this.nameText.setText(this.name);
            this.nameText.setColor(colorText)
        } else {
            this.nameText.setText("");
        }

        // shield - blue square
        for (var i = 0; i < this.rectangles.length; i++) {
            if (i >= this.maxShield) {
                continue;
            }
            let color = 0x0000FF;
            if (i == 0) {
                color = this.getShieldColor(this.shield % 1);
            }
            var rectangle = this.rectangles[i];
            var padding = 6.0;
            var randomRange = 3.0;
            rectangle.setTo(
                (this.x - 1) - this.planetSize * 0.5 - padding + (Math.random() * randomRange * 2.0 - randomRange),
                (this.y - 1) - this.planetSize * 0.5 - padding + (Math.random() * randomRange * 2.0 - randomRange),
                this.planetSize + padding * 2.0 + (Math.random() * randomRange * 2.0 - randomRange),
                this.planetSize + padding * 2.0 + (Math.random() * randomRange * 2.0 - randomRange),
            );
            this.graphics.lineStyle(1, color, 0.7);
            this.graphics.strokeRectShape(rectangle);
        }

        const shipToShoot = this.findShipToShootAt();
        if (shipToShoot && this.populations.species && this.getAllegiance(shipToShoot.team) < 34
            && this.framesSinceAttack >= this.framesPerAttack) {
            const direction = GM.pointDirection(this.x, this.y, shipToShoot.x, shipToShoot.y);
            const bullet = new Bullet(this.scene, this, shipToShoot.x, shipToShoot.y, direction, this.scene.items.items[0].damage, BulletType.torpedo);
            this.scene.addEntity(bullet);
            this.framesSinceAttack = 0;
        }
    }

    get species() {
        return this.populations.species;
    }

    public getPlanetColor(team: Team) {
        const color = this.getPlanetColorHex(team);
        return '#' + ('000000' + color.toString(16)).slice(-6);
    }

    public getPlanetColorHex(team: Team) {
        if (team.isPlayerTeam && this.scene.classic && this.scene.playerShip && !this.scene.classic.isKnown(this)) return 0x999999;
        const allegiance = this.getAllegiance(team);
        if (!this.getTotalPopulationConsumed()) return 0xdddddd;
        if (allegiance <= 33) return team.color === 0x00ff00 ? 0xff0000 : 0x00ff00;
        if (allegiance <= 66) return 0xffff00;
        return team.color;
    }

    private getShieldColor(amount) {
        amount = Math.ceil(amount * 5);
        switch (amount) {
            case 1:
                return 0xFF0000;
            case 2:
                return 0xFF0077;
            case 3:
                return 0xFF00FF;
            case 4:
                return 0x7700FF;
            case 5:
                return 0x0000FF;
        }
        return 0x0000FF;
    }

    private findShipToShootAt() {
        let closest = {
            distance: null,
            ship: null,
        };
        for (const ship of this.scene.entities) {
            if (ship instanceof Ship) {
                if (this.getAllegiance(ship.team) < 34 && !ship.cloaked && ship.dead <= 0) {
                    const distance = GM.pointDistance(this.x, this.y, ship.x, ship.y);
                    if (!closest.ship || closest.distance > distance) {
                        closest.ship = ship;
                        closest.distance = distance;
                    }
                }
            }
        }
        if (closest.distance < this.attackRange) {
            return closest.ship;
        }
        return null;
    }

    slowUpdate() {
        this.draw();
        this.populations.calculatePopulationChange(this.maxPopulation);
        if (this.resources < 5 && this.getAllegiance(this.scene.playerTeam) > 66 && !this.distressReported) {
            this.scene.classic.log('Distress > ' + this.name + ' is running out of ore. Deliver resources.');
            this.distressReported = true;
        }
        if (this.resources >= 5) this.distressReported = false;
        if (this.populations.quantity > 0) {
            this.resources = Math.max(0, Math.min(100, this.resources + this.mining * 0.1 - this.populations.quantity / 100000));
            if (this.sickness > 0) this.populations.quantity = Math.max(0, this.populations.quantity * (1 - this.sickness / 10000));
        }

        if(this.populations) {
            if(this.populations.getAllegianceForPlayer(this.scene.playerShip.team) > 66) {
                this.scene.playerShip.money += this.getTaxIncome();
            }

            for(const enemyShip of this.scene.enemyShips) {
                if(this.populations.getAllegianceForPlayer(enemyShip.team) > 66) {
                    enemyShip.money += this.getTaxIncome();
                    break;
                }
            }
        }
    }

    private getTaxIncome(): number {
        if(this.populations) {
            return this.populations.quantity * 0.1;
        }

        return 0;
    }

    private createMaxPopulationLimit() {
        var temp = 10000000;
        this.maxPopulation = temp * this.planetType.maxPopulationModifier * this.planetSize;
    }

    private createInfrastructureLimits() {
        var temp = 100;
        this.maxAgriculture = temp * this.planetType.maxAgricultureModifier * this.planetSize;
        this.maxDefence = temp * this.planetType.maxDefenceModifier * this.planetSize;
        this.maxEducation = temp * this.planetType.maxEducationModifier * this.planetSize;
        this.maxIndustry = temp * this.planetType.maxIndustryModifier * this.planetSize;
        this.maxMining = temp * this.planetType.maxMiningModifier * this.planetSize;
        this.maxSpacePort = temp * this.planetType.maxSpacePortModifier * this.planetSize;
    }

    get infrastructureLevel(): number {
        return this.agriculture
            + this.industry
            + this.defence
            + this.mining
            + this.spacePort
            + this.education;
    }

    get maxInfrastructureLevel(): number {
        return this.maxAgriculture
            + this.maxIndustry
            + this.maxDefence
            + this.maxMining
            + this.spacePort
            + this.maxEducation
    }

    draw() {
        this.graphics.clear();
        if (this.getTotalPopulationConsumed() > 0) {
            this.graphics.lineStyle(1, 0x00ff00);
        } else {
            this.graphics.lineStyle(1, 0xdddddd);
        }
        this.graphics.strokeCircleShape(this.circle);
    }

    get canSell(): boolean {
        // @todo check alliance
        return this.getTotalPopulationConsumed() > 0;
    }

    get canMine(): boolean {
        if (this.getTotalPopulationConsumed() > 0) {
            return false;
        }
        if (this.resources <= 0) {
            return false;
        }
        return true;
    }

    public canInvest(team: Team): boolean {
        const allegiance = this.getAllegiance(team);
        if (allegiance === null) {
            return false;
        }
        if (allegiance <= 20) {
            return false;
        }
        if (this.infrastructureLevel >= this.maxInfrastructureLevel) {
            return false;
        }
        return true;
    }

    public remainingInvestmentInAgriculture(): number {
        if (this.agriculture < this.maxAgriculture) {
            return (this.maxAgriculture - this.agriculture) * 1000;
        }

        return -1;
    }

    public remainingInvestmentInEducation(): number {
        if (this.education < this.maxEducation) {
            return (this.maxEducation - this.education) * 1000;
        }

        return -1;
    }

    public remainingInvestmentInDefence(): number {
        if (this.defence < this.maxDefence) {
            return (this.maxDefence - this.defence) * 1000;
        }

        return -1;
    }

    public remainingInvestmentInIndustry(): number {
        if (this.industry < this.maxIndustry) {
            return (this.maxIndustry - this.industry) * 1000;
        }

        return -1;
    }

    public remainingInvestmentInSpaceport(): number {
        if (this.spacePort < this.maxSpacePort) {
            return (this.maxSpacePort - this.spacePort) * 1000;
        }

        return -1;
    }

    public remainingInvestmentInMining(): number {
        if (this.mining < this.maxMining) {
            return (this.maxMining - this.mining) * 1000;
        }

        return -1;
    }

    public investInMining(ship: Ship, money: number) {
        this.mining += money;
        ship.money -= money;
        this.populations.increaseAllegianceForPlayer(ship.team, money)
    }

    public investInAgriculture(ship: Ship, money: number) {
        this.agriculture += money;
        ship.money -= money;
        this.populations.increaseAllegianceForPlayer(ship.team, money)
    }

    public investInDefence(ship: Ship, money: number) {
        this.defence += money;
        ship.money -= money;
        this.populations.increaseAllegianceForPlayer(ship.team, money)
    }

    public investInIndustry(ship: Ship, money: number) {
        this.industry += money;
        ship.money -= money;
        this.populations.increaseAllegianceForPlayer(ship.team, money)
    }

    public investInEducation(ship: Ship, money: number) {
        this.education += money;
        ship.money -= money;
        this.populations.increaseAllegianceForPlayer(ship.team, money)
    }

    public investInSpacePort(ship: Ship, money: number) {
        this.spacePort += money;
        ship.money -= money;
        this.populations.increaseAllegianceForPlayer(ship.team, money)
    }

    public spriteNameFor(planetType: PlanetType) {
        switch (planetType.typeName) {
            case "Gas Giant":
                return "planet-gasgiant";
            case "Volcanic":
                return "planet-volcanic";
            case "Continental":
                return "planet-continental";
            case "Jungle":
                return "planet-jungle";
            case "Forest":
                return "planet-forest";
            case "Desert":
                return "planet-desert";
            case "Barren":
                return "planet-barren";
            case "Ocean":
                return "planet-ocean";
            case "Ice":
                return "planet-ice";
            case "Tundra":
                return "planet-tundra";
            case "Gaia":
                return "planet-gaia";
        }
        return "planet-barren";
    }

    private animationNameFor(planetType: PlanetType) {
        switch (planetType.typeName) {
            case "Gas Giant":
                return "planet-gasgiant-animation";
            case "Volcanic":
                return "planet-volcanic-animation";
            case "Continental":
                return "planet-continental-animation";
            case "Jungle":
                return "planet-jungle-animation";
            case "Forest":
                return "planet-forest-animation";
            case "Desert":
                return "planet-desert-animation";
            case "Barren":
                return "planet-barren-animation";
            case "Ocean":
                return "planet-ocean-animation";
            case "Ice":
                return "planet-ice-animation";
            case "Tundra":
                return "planet-tundra-animation";
            case "Gaia":
                return "planet-gaia-animation";
        }
        return "planet-barren-animation";
    }

    public getTotalPopulationConsumed(): number {
        return this.populations.calculatePopulationConsumption();
    }

    static getHabitablePlanetFromLevel(level: Level, sectorNumber: number): Planet {
        let planet: Planet = null;
        let bail = 100;
        do {
            const tempPlanet = level.planets[Math.floor(Math.random() * level.planets.length)];
            if (tempPlanet.sectorNumber == sectorNumber && !tempPlanet.getTotalPopulationConsumed()) {
                planet = tempPlanet;
                break;
            }
            if (bail-- <= 0) {
                throw new Error('Can not find home planet');
            }
        } while (planet === null);

        return planet;
    }

    public getAllegiance(team: Team) {
        if (!this.getTotalPopulationConsumed()) {
            return null;
        }
        return this.populations.getAllegianceForPlayer(team);
    }
    damage(amount: number, blastDirection: number) {
        const disruptors = [this.scene.playerShip].concat(this.scene.enemyShips).filter(ship => ship.disrupting && Math.floor(ship.x / 600) === Math.floor(this.x / 600) && Math.floor(ship.y / 600) === Math.floor(this.y / 600)).length;
        const layers = Math.floor(Math.ceil(this.shield) / Math.pow(2, disruptors));
        const impact = amount / Math.pow(2, layers);
        this.shield = Math.max(0, this.shield - amount * 0.1);
        this.maxShield = Math.ceil(this.shield);
        this.populations.quantity -= (this.populations.quantity * impact + 200) * impact;
        if (this.populations.quantity <= 0) {
            this.populations.quantity = 0;
            this.populations.species = null;
            const inhabited = this.scene.level.planets.filter(p => p.getTotalPopulationConsumed() > 0);
            if (inhabited.length && inhabited.every(p => p.getAllegiance(this.scene.playerTeam) > 66)) this.scene.ui.win();
            else if (!inhabited.some(p => p.getAllegiance(this.scene.playerTeam) > 66)) this.scene.ui.lose();
        }
    }
}
