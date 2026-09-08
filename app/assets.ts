import DefaultScene from "./scenes/default";

export default class Assets {
    constructor(private scene: DefaultScene) {
    }

    preload() {
        this.scene.load.image('red-circle', 'red-circle.png');
        this.scene.load.image('green-circle', 'green-circle.png');
        this.scene.load.image('blue-circle', 'blue-circle.png');
        this.scene.load.image('star', 'star.png');
        this.scene.load.image('bullet', 'bullet.png');
        this.scene.load.image('torpedo', 'original/torpedo.png')
        this.scene.load.image('mine', 'original/mine.png');
        this.scene.load.image('hot-torpedo', 'original/hot-torpedo.png')
        this.scene.load.image('nuke', 'original/nuke.png')
        this.scene.load.image('ship', 'original/ship.png');
        this.scene.load.image('ship2', 'original/ship2.png');
        this.scene.load.image('ship3', 'original/ship3.png');
        this.scene.load.image('ship4', 'original/ship4.png');
        this.scene.load.image('laser', 'laser.png');

        var planetNames = ["barren", "continental", "desert", "forest", "gaia", "gasgiant", "ice", "jungle", "ocean", "tundra", "volcanic"];
        for (var planetName of planetNames) {
            this.scene.load.spritesheet("planet-" + planetName, "original/planet-" + planetName + "-sprite.png", {
                frameWidth: 72,
                frameHeight: 69,
            });
        }

        this.scene.load.spritesheet("nuclear-explosion", "original/nuclear-explosion-sprite.png", {
            frameWidth: 126,
            frameHeight: 124,
        });

        for (const explosionName of ["explosion", "explosion1", "explosion2", "explosion3", "explosion4"]) {
            this.scene.load.spritesheet(explosionName, "original/" + explosionName + "-sprite.png", {
                frameWidth: 64,
                frameHeight: 64,
            });
        }

        const sounds = {
            numkey: 'click', mining: 'mining', explosion: 'boom',
            laser: 'laser', 'laser-hit': 'crack', 'nuke-exp': 'neutron',
            menu_switch: 'click', nooo: 'deadship', torpedo: 'torpedo',
            mine: 'mine', plague: 'plague', antibio: 'antibio',
            'stealth-on': 'stelon', 'stealth-off': 'steloff',
            'disrupter-on': 'scrmon', 'disrupter-off': 'scrmoff',
        };
        for (const key of Object.keys(sounds)) {
            this.scene.load.audio(key, 'original/sounds/' + sounds[key] + '.wav');
        }
    }

    create() {
        var planetNames = ["barren", "continental", "desert", "forest", "gaia", "gasgiant", "ice", "jungle", "ocean", "tundra", "volcanic"];
        for (var planetName of planetNames) {
            this.scene.anims.create({
                key: "planet-" + planetName + "-animation",
                frames: this.scene.anims.generateFrameNumbers("planet-" + planetName, {
                    start: 0,
                    end: 18,
                }),
                frameRate: Math.random() * 10 + 10,
                repeat: -1,
            });
        }

        this.scene.anims.create({
            key: "explosion-animation",
            frames: this.scene.anims.generateFrameNumbers("explosion", {
                start: 0,
                end: 18,
            }),
            frameRate: Math.random() * 10 + 10,
            repeat: 0,
        });
        var explosionNames = ["explosion1", "explosion2", "explosion3", "explosion4"];
        for (var explosionName of explosionNames) {
            this.scene.anims.create({
                key: explosionName + "-animation",
                frames: this.scene.anims.generateFrameNumbers(explosionName, {
                    start: 0,
                    end: 64,
                }),
                frameRate: 200,
                repeat: 0,
            });
        }
        

        this.scene.anims.create({
            key: "nuclear-explosion-animation",
            frames: this.scene.anims.generateFrameNumbers("nuclear-explosion", {
                start: 0,
                end: 15,
            }),
            frameRate: Math.random() * 10 + 10,
            repeat: 0,
        });
    }
}
