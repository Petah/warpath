import GameEventSelectableOption from './gameEventSelectableOption';

export default class GameEvent {
    title: string;
    message: string;
    imageLocation: string;
    eventOptions: GameEventSelectableOption[];
    actors: any[]; // JS pls

    constructor(
        title: string,
        message: string,
        imageLocation: string,
        eventOptions: GameEventSelectableOption[],
        actors: any[]
    ) {
        this.title = title;
        this.message = message;
        this.imageLocation = imageLocation;
        this.eventOptions = eventOptions;
        this.actors = actors;
    }
}
