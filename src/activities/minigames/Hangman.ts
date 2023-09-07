import Minigame from "./Minigame.js";
import type Session from "../sessions/Session.js";

/**
 * One "Hangman" represents a session.
 */
export default class Hangman extends Minigame {

    public readonly name = "hangman";

    static readonly words = ["SCIENCE", "HISTORY", "ENGLISH", "BIOLOGY", "MATH", "MICROSCOPE",
        "LUNCH", "PIZZA", "BAND", "ORCHESTRA", "CHORUS", "COMPUTER", "HOMEWORK", "WEBSITE", "COLLEGE",
        "SCHOOL", "PHONE", "ART", "WHITEBOARD", "PENCIL", "ERASER", "TEST", "QUIZ", "CLUB", "COLLECTION",
        "TACO", "CHEESE", "JAZZ", "CLOCK", "BLOCK", "PEN", "CALCULATOR", "CANDY", "SCALPEL", "PAPER",
        "ESSAY", "CLASS", "TEACHER", "LOADING", "SIGN", "TIME", "FOOD", "WATER", "WORK", "STUDY",
        "GRADE", "ACTIVITY", "SLEEP", "BOOK", "WORD"];

    word: string;
    guessedLetters: string[] = [];
    lives = 6;
    wager = 10000;
    startedAt: number;

    constructor() {
        super();

        
    }

    finish(win: boolean) {
        const SUMMARY = {
            won: win,
            word: this.word,
            livesRemaining: this.lives,
            pointChange: null,
            player: this.session.player.id,
            gameDuration: Math.floor(performance.now() - this.startedAt),
        }
        if (win) {
            this.session.queueActivityEmit("win", this.word, this.wager);
            this.session.player.points += (this.wager);
            SUMMARY.pointChange = this.wager;
        } else {
            this.session.queueActivityEmit("loss", this.word, -this.wager / 2);
            this.session.player.points -= (this.wager / 2);
            SUMMARY.pointChange = -this.wager / 2;
        }
        this.summarize(SUMMARY);
        this.restart();

    }

    restart() {
        let newWord;
        do {
            newWord = Hangman.words[Math.floor(Math.random() * Hangman.words.length)];
        } while (newWord === this.word);
        this.word = newWord;
        this.lives = 6;
        this.guessedLetters = [];
        this.sessions.activityEmitToAll("setLives", this.lives);
        this.sessions.activityEmitToAll("restart", this.word.length);
        this.startedAt = performance.now();
    }
    public attach(session: Session): void {
        super.attach(session);

        this.session.onActivity("guess", (letter: string) => {
            
            if (this.word.includes(letter)) {
                if (!this.guessedLetters.includes(letter)) this.guessedLetters.push(letter);
                const INDEXES: number[] = [];
                for (let i = 0; i < this.word.length; i++) {
                    console.log(this.word[i], letter, this.word[i] === letter);
                    
                    if (this.word[i] === letter) INDEXES.push(i);
                }
                console.log(INDEXES, this.word);
                
                this.session.queueActivityEmit("reveal", letter, INDEXES);

                for (const L of this.word) {
                    if (!this.guessedLetters.includes(L)) return;
                }
                this.finish(true);

            } else {
                this.lives--;
                this.session.queueActivityEmit("setLives", this.lives);
                if (this.lives < 1) {
                    this.finish(false);
                }
            }
        });
        this.restart();
    }

    destroy() {
        this.session.offActivity("guess");
    }

}