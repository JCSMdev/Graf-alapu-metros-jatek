export default class Player {
    constructor(player_name) {
        this.name = player_name
        this.score = 0
        this.time  = 0
    }
}
export class Connection {
    constructor(id1,id2) {
        this.id1 = id1
        this.id2 = id2
        
    }
    equals(that) {
        return (this.id1 === that.id1 && this.id2 === that.id2) ||
        (this.id1 === that.id2 && this.id2 === that.id1)
               
    }
}

export class Station {
    constructor(id, x, y, type, train, side, district ) {
        this.id = id
        this.x = x
        this.y = y
        this.type = type
        this.train = train
        this.side = side
        this.district = district
        this.connections = [[],[],[],[]]
    }
    static fromTd(td){
        const id = Number(td.dataset.id)
        const x = Number( td.dataset.x)
        const y = Number(td.dataset.y)
        const type = td.dataset.type
        const train = td.dataset.train === "true"
        const side = td.dataset.side
        const district = Number(td.dataset.district)
        return new Station(id,x,y,type,train,side,district)
    }
    connect(station,metro){
        if(!this.isConnectedTo(station,metro)) {
            this.connections[metro].push(station)
        }
        return this
    }

    isSameAs(other) {
        return other instanceof Station && this.id === other.id
    }

    isConnectedTo(station,metro) {
        return this.connections[metro].some(s => s.isSameAs(station))
    }
    canBeConnectedTo(station,metro) {
        return !this.isConnectedTo(station,metro) && !station.isConnectedTo(this,metro) && this.connections[metro].length < 2 && station.connections[metro].length < 2
    }
}
export class MetroCard {
    static inner_count = 0
    static outer_count = 0
    static type = "középső"
    static letter = "?"
    static valto = false
    static next() {
        const letters = "ABCD?".split("")
        const types = ["középső", "szélső"]
        this.type =  this.valto ? "középső" : types[Math.random() > 0.5 ? 1 : 0]
        this.letter = letters[Math.floor(Math.random() * letters.length)]
        if (this.type === "középső") this.inner_count++
        else this.outer_count++
    }
    static reset() {
        this.inner_count = 0
        this.outer_count = 0
    }
}
