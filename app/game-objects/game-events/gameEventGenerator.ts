import Ship from "../../ship";
import GameEvent from "./gameEvent";
import Planet from "../../planet";

export default class GameEventGenerator {
    colonizePlanet(ship: Ship, planet: Planet): GameEvent {
        if(ship.speed == 0 || planet.populations.quantity != 0) {
            return null;
        }

        // var gameEvent = new GameEvent(",", "", "", new GameEventSelectableOption );
        

        return null;
    }

    temp2: {

    }
}
