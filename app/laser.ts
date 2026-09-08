import GM from "./gm";
import DefaultScene from "./scenes/default";
import Entity from "./entity";
import Blast from "./blast";
import Ship from "./ship";
import Planet from "./planet";

export default class Laser implements Entity{
    private image: Phaser.Physics.Arcade.Image;
    private speed: number = 800;

    private line: Phaser.Geom.Line;
    private graphics: Phaser.GameObjects.Graphics;
    private startX: number;
    private startY: number;

    constructor(
        private scene: DefaultScene,
        private owner: any,
        private dx: number,
        private dy: number,
        private direction: number,
    ) {
        this.image = this.scene.physics.add.image(owner.x, owner.y, 'laser');
        this.startX = owner.x;
        this.startY = owner.y;
        
        this.graphics = this.scene.add.graphics({
            lineStyle: {
                width: 1,
                color: 0x00ff00,
            }
        });
        this.graphics.depth = 300;
        this.line = new Phaser.Geom.Line(this.x, this.y, this.owner.x, this.owner.y);


        // audio
        this.scene.soundManager.playFromLocation('laser', owner.x, owner.y);
        
    }

    update() {
        let vx = GM.lengthDirX(this.speed, this.direction);
        let vy = GM.lengthDirY(this.speed, this.direction);
        this.image.angle = this.direction;
        this.image.setVelocityX(vx);
        this.image.setVelocityY(vy);
        
        this.line.x1 = this.x;
        this.line.y1 = this.y;
        this.line.x2 = this.owner.x;
        this.line.y2 = this.owner.y;
        this.graphics.clear();
        this.graphics.strokeLineShape(this.line);

        const distance = GM.pointDistance(this.startX, this.startY, this.x, this.y);
        const maxDistance = GM.pointDistance(this.startX, this.startY, this.dx, this.dy);
        if (distance >= maxDistance) {
            this.blast();
            return;
        }
        
        for (const entity of this.scene.entities) {
            if (entity instanceof Ship && entity != this.owner) {
                const distance = GM.pointDistance(this.x, this.y, entity.x, entity.y);
                if (distance < 25) {
                    this.blast();
                    return;
                }
            }
            if (entity instanceof Planet && entity.species != this.owner.species) {
                const distance = GM.pointDistance(this.x, this.y, entity.x, entity.y);
                if (distance < 25) {
                    this.blast();
                    return;
                }
            }
        }
    }

    private blast() {
        this.graphics.destroy();
        this.scene.removeEntity(this);
        const blast = new Blast(this.scene, this.x, this.y, this.direction, 0.19, "explosion1", "explosion1-animation", 10);
        this.scene.addEntity(blast);
        this.scene.soundManager.playFromLocation('laser-hit', this.x, this.y);
        this.image.destroy();
    }
    
    slowUpdate() {

    }

    get x() {
        return this.image.x;
    }

    get y() {
        return this.image.y;
    }
};
