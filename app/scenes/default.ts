import Ship from "../ship";
import Assets from "../assets";
import Level from "../level";
import Stars from "../stars";
import Entity from "../entity";
import SoundManager from "../soundmanager";
import UI from "../ui";
import Team from "../team";
import Items from "../items";
import Planet from "../planet";
import Enemy from "../enemy";
import Human from "../game-objects/entity-types/planet-related-objects/populationObjects/human";
import Ork from "../game-objects/entity-types/planet-related-objects/populationObjects/ork";

export default class DefaultScene extends Phaser.Scene {

    public playerShip: Ship;
    public enemyShips: Ship[] = [];
    public level: Level;
    public ui: UI;
    private assets: Assets;
    private stars: Stars;
    public graphics: Phaser.GameObjects.Graphics;
    public entities: Entity[] = [];
    public enemyTeams: Team[] = [];
    public playerTeam: Team;
    public items: Items;
    private numUpdates: number = 0;
    public gameTime: number = 0;
    public soundManager: SoundManager;

    constructor() {
        super('default');
    }

    init(data) {
        console.debug('init', data, this);
        this.soundManager = new SoundManager(this);
        this.ui = new UI(this);
    }

    preload() {
        this.assets = new Assets(this);
        this.assets.preload();

        this.graphics = this.add.graphics({});

        this.load.image('sky', 'space3.png');
        this.load.on('progress', this.onLoadProgress, this);
        this.load.on('complete', this.onLoadComplete, this);
    }

    create() {
        this.assets.create();

        this.items = new Items(this);

        this.level = new Level(this);
        this.addEntity(this.level);

        this.stars = new Stars(this);
        this.addEntity(this.stars);

        const maxEnemyTeams = 3;

        // Make the teams
        this.playerTeam = new Team(this, 0x00FF00, true, 1);
        for (let i = 0; i < maxEnemyTeams; i++) {
            const color = Team.randomColor();
            const enemyTeam = new Team(this, color, false, i + 2);
            this.enemyTeams.push(enemyTeam);

        }

        // Set the home planets
        const human = new Human();
        const ork = new Ork();
        let playerHomePlanet = Planet.getHabitablePlanetFromLevel(this.level, 1);
        playerHomePlanet.populations.quantity = 1000;
        playerHomePlanet.populations.species = human;
        playerHomePlanet.team = this.playerTeam;
        playerHomePlanet.education = 0.5 + (Math.random() * 0.5);
        playerHomePlanet.spacePort = 0.5 + (Math.random() * 0.5);
        playerHomePlanet.mining = 0.5 + (Math.random() * 0.5);
        playerHomePlanet.agriculture = 0.5 + (Math.random() * 0.5);
        playerHomePlanet.industry = 0.5 + (Math.random() * 0.5);
        playerHomePlanet.defence = 0.5 + (Math.random() * 0.5);
        playerHomePlanet.maxShield = Math.round(5 * playerHomePlanet.defence);
        playerHomePlanet.shield = playerHomePlanet.maxShield;
        playerHomePlanet.resources = Math.random() * 40 + 10;
        playerHomePlanet.populations.setAllegianceForTeam(this.playerTeam, 100);

        const enemyHomePlanets = [];
        for (let i = 0; i < maxEnemyTeams; i++) {
            const enemyTeam = this.enemyTeams[i];
            let enemyHomePlanet = Planet.getHabitablePlanetFromLevel(this.level, i + 2);
            enemyHomePlanet.team = enemyTeam;
            enemyHomePlanet.populations.quantity = 1000;
            enemyHomePlanet.populations.species = ork;
            enemyHomePlanet.education = 0.5 + (Math.random() * 0.5);
            enemyHomePlanet.spacePort = 0.5 + (Math.random() * 0.5);
            enemyHomePlanet.mining = 0.5 + (Math.random() * 0.5);
            enemyHomePlanet.agriculture = 0.5 + (Math.random() * 0.5);
            enemyHomePlanet.industry = 0.5 + (Math.random() * 0.5);
            enemyHomePlanet.defence = 0.5 + (Math.random() * 0.5);
            enemyHomePlanet.maxShield = Math.round(5 * enemyHomePlanet.defence);
            enemyHomePlanet.shield = enemyHomePlanet.maxShield;
            enemyHomePlanet.resources = Math.random() * 40 + 10;
            enemyHomePlanet.populations.setAllegianceForTeam(enemyTeam, 100);
            enemyHomePlanets.push(enemyHomePlanet);
        }

        // Spawn the ships
        this.playerShip = new Ship(this, this.playerTeam, playerHomePlanet, human, 'ship');
        this.ui.playerShip = this.playerShip;
        this.addEntity(this.playerShip);
        playerHomePlanet.draw();

        for (let i = 0; i < maxEnemyTeams; i++) {
            const enemyTeam = this.enemyTeams[i];
            let enemyShip = new Enemy(this, enemyTeam, enemyHomePlanets[i], ork, 'ship' + (i + 2));
            this.enemyShips.push(enemyShip);
            this.ui["enemyShip" + i] = enemyShip;
            this.addEntity(enemyShip);
            enemyHomePlanets[i].draw();
        }

        this.ui.drawMiniMap();
        this.ui.slowUpdate();

        this.physics.world.setBounds(0, 0, this.level.width, this.level.height);
        this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
        this.cameras.main.startFollow(this.playerShip.image, true, 0.05, 0.05);




    }

    update() {
        this.numUpdates++;
        let slowUpdate = false;
        if (this.numUpdates % 100 === 0) {
            this.gameTime++;
            slowUpdate = true;
            this.ui.slowUpdate();
        }
        for (const entity of this.entities) {
            entity.update();
            if (slowUpdate) {
                entity.slowUpdate();
            }
        }
        if (this.numUpdates % 3 === 0) {
            this.ui.updateUi();
        }
    }

    addEntity(entity: Entity) {
        this.entities.push(entity);
    }

    removeEntity(entity: Entity) {
        this.entities.splice(this.entities.indexOf(entity), 1);
    }


    onLoadComplete(loader, totalComplete, totalFailed) {
    }

    onLoadProgress(progress) {
    }

};
