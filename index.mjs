

const DEFAULT = 'DEFAULT'

async function spawn(actorSystem, modPath) {
    const url = new URL(modPath, location.origin)
    const actorDefinition = await import(url.href).then(mod => mod.default)

    const id = Math.random().toString(36).substr(2, 9);
    actorSystem.actors[id] = Object.assign(actorDefinition, { id, url: url.href });

    return id
}

function tell(receiver, sender, type, message) {
    const msg = {
        sender,
        receiver,
        type,
        message,
    };

    globalThis.dispatchEvent(new CustomEvent("actor:message", { detail: msg }));
}


function WorkerPool(url, onMessage) {
    this.maxWorkers = navigator.hardwareConcurrency;
    this.currentWorker = 0
    this.workerList = [];
    this.postMessage = (data) => {
        this.workerList[this.currentWorker].postMessage(data);
        this.currentWorker = this.currentWorker < this.maxWorkers ? this.currentWorker + 1 : 0;
    }

    for (let i = 0; i <= this.maxWorkers; i++) {
        this.workerList[i] = new Worker(url, { name: i, type: 'module' });
        this.workerList[i].onmessage = onMessage
    }
}


function ActorSystem(settings) {


    const onMessageFromWorker = async (e) => {

        switch (e.data.cmd) {
            case 'spawn':
                // console.log('spawn', e.data)
                const id = await spawn(this, e.data.actor.url)
                console.log('spawnder', e.data, id)
                break;

            default:
                console.log('message from worker pool', e.data)
                break;
        }
    }

    const workerUrl = new URL('./worker.mjs', location.origin)
    // const pool = new WorkerPool(createWorkerCode(settings.actors), function onMessageFromWorker(e) {
    const pool = new WorkerPool(workerUrl.href, onMessageFromWorker)

    this.actors = {};

    if (settings.root) {
        spawn(this, settings.root);
    }

    globalThis.addEventListener("actor:message", ({ detail }) => {
        // console.log("on messaage", detail, this.actors);

        if (detail.receiver in this.actors) {
            const actor = this.actors[detail.receiver]
            const workerMessage = {
                url: actor.url,
                id: actor.id,
                behavior: actor.behavior.current,
                type: detail.type,
                msg: detail
            }
            pool.postMessage(workerMessage)
            // this.actors[detail.receiver].handlers[this.actors[detail.receiver].behavior.current][detail.type]({
            //     message: detail.message,
            //     sender: detail.sender,
            //     spawn: (actorDefinition) => spawn(this, actorDefinition),
            //     tell: (id, type, message) => tell(id, detail.sender, type, message)
            // });
        }
    });



    // requestAnimationFrame()



    if (settings.debug) {
        globalThis.Thesis = {
            version: 1,
            getActors: () => this.actors,
            tell: (pid, text) => tell(pid, "repl", "start", text),
        };
    }
}


export function actor(handlers, {
    default_behaviour = DEFAULT
} = {}) {

    if (!Reflect.has(handlers, default_behaviour)) {
        handlers = {
            [default_behaviour]: handlers
        }
    }

    return Object.create(null, {
        // id: {
        //     value: Symbol.for(Math.random().toString(36).substr(2, 9)),
        //     writable: false,
        // },
        handlers: {
            value: handlers,
            writable: false
        },
        // mailbox: {
        //     value: []
        // },
        behavior: {
            value: {
                current: DEFAULT
            },
        }
    });
}


// const echo = actor({
//     print({ message }) {
//         console.log('Echo:', message)
//     }
// })

// const rootActor = actor({
//     start({ message, spawn, tell }) { // message, sender, tell, ask, spawn, link, become, unbecome
//         console.log("Received", message);
//         const a = spawn(echo)
//         console.log('pid??', a)
//         tell(a, 'print', '[proxied] ' + message)
//     },
// });


const myApp = new ActorSystem({
    root: './root.mjs',
    debug: true,
});
/*

Methods:
- spawn
- link
- become
- unbecome
- send/tell
- ask

Messages:
- start
- stop
- down
- crash
- kill
- restart
- died

Components
- Actor
- ActorSystem


Support:
Node
Deno
Browser
*/
