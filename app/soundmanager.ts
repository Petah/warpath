import GM from "./gm";
import DefaultScene from "./scenes/default";

export default class SoundManager {

    constructor(
        private scene: DefaultScene
    ) {

    }

    playFromLocation(name: string, x: number, y: number) {
        if (this.scene != null) {
            var distance = GM.pointDistance(this.scene.playerShip.x, this.scene.playerShip.y, x, y);
            var maxDistance = 450.0;
            var volume = (distance < maxDistance) ? ((maxDistance - distance) / maxDistance) * 0.3 : 0.0;
            this.play(name, volume);
        }
    }
    play(name: string, volume: number = null) {
        if (this.scene != null) {
            this.scene.sound.play(name, {
                volume: volume != null ? volume : 1.0
            });
        }
    }
    playLoop(name: string, duration: number, volume: number = null) {
        if (this.scene != null) {
            var loopMarker = {
                name: 'loop',
                start: 0,
                duration: duration,
                config: {
                    loop: true
                }
            };
            var music = this.scene.sound.add(name);
            music.addMarker(loopMarker);
            music.play('loop', {
                volume: (volume != null) ? volume : 1.0
            });
        }
    }
    
};