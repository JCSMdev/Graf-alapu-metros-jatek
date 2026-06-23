import { loadJson } from "./jsonLoader.js"
import { Station, MetroCard } from "./gameClasses.js"
import { shuffle } from "./mathUtils.js"
import { savePlayer } from "./localStorageHandler.js"

const stations = await loadJson('./data/stations.json')
const lines = await loadJson('./data/lines.json')

//#region DOM elements
export let game_ended = true
let round_ended = false

export const mainMenu = document.querySelector('#mainMenu')

const gameContainer = document.querySelector("#game-menu")


export const playerNameDisplay = document.querySelector("#player-name-display")
const lineRoundDisplay = document.querySelector('#metro-order')

// #region Scoring
const districtScoresDisplay = document.querySelector('#district-score')
let districtScoreTable = [...Array(4).keys()].map(l => [...Array(lines.length).keys()].map(d => 0))
let districtScoreSum = 0

const affectedMainStationsScoreDisplay = document.querySelector('#erintett-palyaudvar')
const affectedMainStationsScores = [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25]
let affectedMainStationsIndex = 0

const nodeScoresDisplay = document.querySelector('#csomopontok')
const nodeIcons = ["╚","╩","╬"]
const nodeMultipliers = [2,5,9]
const nodeScores = [0,0,0]

const finalSumDisplay = document.querySelector('#final-sum')
let finalScore = 0
// #endregion

const timeDisplay = document.querySelector("#time-display")

let timeS = 0
let timer
export const gameMapContainer = document.querySelector("#gameMap")

const nextCardBtn = document.querySelector("#game-right-side button")
nextCardBtn.addEventListener('click', () => handleCardPull())

const cardDisplay = document.querySelector('#flipCard')
let rotation = 0
let has_card = false
let auto_pull = false

//#endregion

let line_order = lines.map(l => l.id)
let lineRound = 0
let buildRound = 0

let selection = []
let connected_stations = []
let currentLine = []

let selectables = new Set()

let start_station

let currentPlayer

let extra_info = false

// helper
const sum_s = s => s.connections.reduce((count, arr) => count + (arr.length > 0 ? 1 : 0), 0)

export function startNewGame(player) {
    currentPlayer = player
    districtScoreSum = 0
    districtScoreTable = [...Array(4).keys()].map(l => [...Array(lines.length).keys()].map(d => 0))
    lineRound = -1
    game_ended = false
    selectables.clear()
    shuffle(line_order)


    // HTML stuff
    generateGameMap()
    mainMenu.style.display = "none"
    gameContainer.style.display = "flex"
    nextCardBtn.innerText = "Következő Kártya"

    //Timers
    clearInterval(timer)
    timeS = 0
    renderTimeDisplay()

    startTimer()
    connected_stations = []
    newLineRound()
}
function newLineRound() {

    round_ended = false
    has_card = false
    MetroCard.valto = false
    lineRound++
    if(lineRound <= lines.length) {
        CalculateScore()
    }

    currentLine = []

    if (start_station) {
        gameMapContainer.rows[start_station.y].cells[start_station.x].querySelector('.station').classList.remove('pulsating-element')
    }
    removePulsatingAnimation()
    selectables.clear()

    // End of game
    if (lineRound === lines.length) {
        game_ended = true
        stopTimer()
        nextCardBtn.innerText = "Befejezés"
        deselectStations()
        //connected_stations = []
        console.log("vége")

        return
    }

    // A kör kezdő állomása
    const s = stations[lines[line_order[lineRound]].start]
    start_station = new Station(s.id, s.x, s.y, s.type, s.train, s.side, s.district)
    selectables.add(start_station.id)
    if (!connected_stations.some(s => s.isSameAs(start_station))) {
        connected_stations.push(start_station)
    }
    currentLine.push(start_station)
    gameMapContainer.rows[start_station.y].cells[start_station.x].querySelector('.station').classList.add('pulsating-element')

    // Alsó menü

    lineRoundDisplay.innerHTML = line_order.map(id => `<span class="metro google-sans-code-1 ${lines[id].name} ${(line_order[lineRound] !== id ? "inactive" : "")}">${lines[id].name}</span>`).join(" ")

    buildRound = 0
}
function generateGameMap() {
    const svg = document.querySelector('#connectionLines g[filter="url(#dropShadow)"]')
    svg.innerHTML = `<line x1="0%" y1="0%" x2="100%" y2="100%" stroke="rgba=(0,0,0,0)" stroke-width="var(--duna-rad)"
                            stroke-linecap="round"></line>`
    gameMapContainer.innerHTML = [...Array(10).keys()].map(c => `<tr>
        ${[...Array(10).keys()].map(r => {
        const station = stations.find(s => s.x === r && s.y === c)
        if (undefined === station) {
            return `<td data-id="${-1}"></td>`
        } else {
            const metro_station = lines.find(l => l.start === station.id)?.name
            return `
            <td data-id="${station.id}" data-x="${station.x}" data-y="${station.y}" data-type="${station.type}" data-train="${station.train}"  data-side="${station.side}" data-district="${station.district}"
            ${(extra_info ? `title="Oldal: ${station.side} Kerület: ${station.district}` : "" )}"
            >
                    <div class="station black-ops-one-regular relative ${metro_station ?? ""}">${station.type}</div>
                    ${(station.train ? `<span class="material-symbols-outlined train-icon">train</span>` : "")}
            </td>`
        }
    }
    ).join(" ")
        }</tr>`).join(" ")
}
// #region Connections
export function handleStationSelect(station) {
    if(game_ended) return
    if (selection.length < 2) {
        const to_select = gameMapContainer.rows[station.y].cells[station.x]
        if (selection.includes(to_select)) {
            selection.shift()
            to_select.classList.remove('selected')
        }
        // Safe to add
        else {
            selection.push(to_select)
            to_select.classList.add('selected')
        }
        if (selection.length === 2) { handleConnection() }
    }
}
function handleConnection() {
    if (selection.length !== 2) {
        invalidAnimation()
        return
    }

    const station2New = Station.fromTd(selection[1])
    const station1New = Station.fromTd(selection[0])

    let station1_in_connected = true
    let station2_in_connected = true

    let station1 = connected_stations.find(s => s.isSameAs(station1New))
    if(! station1) {
        station1 = station1New
        station1_in_connected = false
    }
    let station2 = connected_stations.find(s => s.isSameAs(station2New))
    if(! station2) {
        station2 = station2New
        station2_in_connected = false
    }

    // #region Validation
    if (!has_card) {
        console.log("Húzz kártyát")
        invalidAnimation()
        return
    }
    // az állomás eleget tesz a rács feltételeknek   
    if (!isGridSelection(station1, station2)) {
        console.log("Csak átlósan, függőlegesen vagy vízszintesen választhatsz valamint nem keresztezhetsz másik állomást")
        invalidAnimation()
        return
    }
    if (isCrossingOtherLine(station1, station2)) {
        console.log("Keresztezel egy szakaszt")
        invalidAnimation()
        return
    }
    // Az állomás a vonalon belül van
    if (!MetroCard.valto && (station1.connections[lineRound].length === 2 || station2.connections[lineRound].length === 2)) {
        console.log("Nem építhetsz elágazást")
        invalidAnimation(gameMapContainer)
        return
    }
    
    // Párhuzamosság
    if (connected_stations.some(s => s.isSameAs(station1) && station1.connections.flat().some(c => c.isSameAs(station2)))) {
        console.log("Párhuzamosan vonalat nem építhetsz")
        invalidAnimation()
        return
    }
    
    // Körmentesség 
    let not_connected_station = station1
    if (currentLine.some(s => s.id === not_connected_station.id)) {
        not_connected_station = station2
        if(currentLine.some(s => s.id === not_connected_station.id)) {
            console.log("A vonal körmentes kell legyen")
            invalidAnimation()
            return
        }
    }
     // Az állomás a kártyának megfelelően lett kiválasztva
    // Az állomás betűjele jó kell, hogy legyen a két végpont egyike pedig benne kell, hogy legyen az aktuális metróvonolban
    if (!(not_connected_station.type === MetroCard.letter || not_connected_station.type === "?" || MetroCard.letter === "?")) {
        console.log("Nem a kártyának megfelelő állomást választottál")
        invalidAnimation()
        return
    }
    // Kiválaszthatóság
    if (!(selectables.has(station1.id) || selectables.has(station2.id))) {
        console.log("Az egyiknek a vonal végében kell lennie", selectables, station1.id, station2.id)
        invalidAnimation()
        return
    }

    // #endregion
    // valid animation
    validAnimation()
    const svg = document.querySelector('#connectionLines g[filter="url(#dropShadow)"]')

    const svgLine = (x1, y1, x2, y2, cellCount = 10) => {
        const percent = (cord) => ((cord + 0.5) / cellCount) * 100
        const [x1p, y1p, x2p, y2p] = [
            percent(x1),
            percent(y1),
            percent(x2),
            percent(y2)
        ]

        return `
                <line x1="${x1p}%" y1="${y1p}%" 
                x2="${x2p}%" y2="${y2p}%" 
                stroke="var(--${lines[line_order[lineRound]].name})" 
                stroke-width="2%" 
                stroke-linecap="square" 
                ${MetroCard.valto ? `stroke-dasharray="2 4"` : ""}/>`
    }

    svg.innerHTML += svgLine(station1.x, station1.y, station2.x, station2.y)

    station1.connect(station2, lineRound)
    station2.connect(station1, lineRound)

    const crStation1 = currentLine.find(s => s.isSameAs(station1))
    const crStation2 = currentLine.find(s => s.isSameAs(station2))

    //console.log("Station1: ",station1, " station2: ",station2, " crStation1: ",crStation1, " crStation2: ",crStation2)
    if (crStation1) {crStation1.connect(station2, lineRound)}
    else{currentLine.push(station1.connect(station2, lineRound))}

    if (crStation2) {crStation2.connect(station1, lineRound) }
    else {currentLine.push(station2.connect(station1, lineRound))}

    if (!station1_in_connected) { connected_stations.push(station1.connect(station2, lineRound)) }

    if (!station2_in_connected) { connected_stations.push(station2.connect(station1, lineRound)) }

    use_up_card()
    removePulsatingAnimation()
    deselectStations()
}

function isCrossingOtherLine(station1, station2) {
    const x1 = station1.x, y1 = station1.y
    const x2 = station2.x, y2 = station2.y

    // Orientáció kiszámítása a vektoriális szorzattal 
    function orientation(ax, ay, bx, by, cx, cy) {
        const val = (by - ay) * (cx - bx) - (bx - ax) * (cy - by)
        if (val === 0) return 0  // egy egyenesen vannak
        return val > 0 ? 1 : -1   // 1: óra szerint (felfele), -1: órával ellentétesen (lefele) <-- jobbkéz szabály
    }

    // check if two line segments (p1,q1) and (p2,q2) intersect
    function segmentsIntersect(p1, q1, p2, q2) {
        const o1 = orientation(p1.x, p1.y, q1.x, q1.y, p2.x, p2.y)
        const o2 = orientation(p1.x, p1.y, q1.x, q1.y, q2.x, q2.y)
        const o3 = orientation(p2.x, p2.y, q2.x, q2.y, p1.x, p1.y)
        const o4 = orientation(p2.x, p2.y, q2.x, q2.y, q1.x, q1.y)

        if (o1 !== o2 && o3 !== o4) return true // ha az orientácik nem egyeznek meg biztosan keresztezik egymást

        return false
    }

    for (const s of connected_stations) {
        for (const c of s.connections.flat()) {
            // önmagát nem kell vizsgálni
            if (
                (s.isSameAs(station1) || c.isSameAs(station2)) ||
                (c.isSameAs(station1) || s.isSameAs(station2))
            ) continue

            if (segmentsIntersect(
                { x: x1, y: y1 }, { x: x2, y: y2 }, // berajzolandó szakasz
                { x: s.x, y: s.y }, { x: c.x, y: c.y } // már berajzolt szaksz
            )) {
                return true
            }
        }
    }
    return false
}
function isGridSelection(station1, station2) {
    const x1 = station1.x
    const y1 = station1.y
    const x2 = station2.x
    const y2 = station2.y

    // Ugyanaz az az oszlop
    if (y1 === y2) {
        if (stations.some(s => s.y === y1 && ((s.x > x2 && s.x < x1) || (s.x < x2 && s.x > x1)))) {
            return false
        }
        return true
    }

    // Ugyanaz az a sor
    if (x1 === x2) {
        if (stations.some(s => s.x === x1 && ((s.y > y2 && s.y < y1) || (s.y < y2 && s.y > y1)))) {
            return false
        }
        return true
    }

    // nem diagonális
    const x_dist = Math.abs(x1 - x2)
    const y_dist = Math.abs(y1 - y2)
    if (x_dist !== y_dist) {
        return false
    }
    const between_stations =
        stations.some(s => {
            // ugyanaz az átló kell legyen
            if (Math.abs(s.x - x1) !== Math.abs(s.y - y1)) return false

            // két pont közt van-e
            const betweenX =
                (s.x > Math.min(x1, x2)) && (s.x < Math.max(x1, x2))
            const betweenY =
                (s.y > Math.min(y1, y2)) && (s.y < Math.max(y1, y2))

            return betweenX && betweenY
        })
    return !between_stations
}
// #endregion

// #region Animations
function deselectStations() {
    selection.forEach(s => {
        setTimeout(() => gameMapContainer.rows[Number(s.dataset.y)].cells[Number(s.dataset.x)].classList.remove('selected'), 100)
    })
    selection = []
}
function invalidAnimation() {
    selection.forEach(s => {
        const cell = gameMapContainer.rows[Number(s.dataset.y)].cells[Number(s.dataset.x)]
        cell.classList.add('invalid')
        setTimeout(() => cell.classList.remove('invalid'), 300)
    })
    deselectStations()
}
function validAnimation() {
    selection.forEach(s => {
        const cell = gameMapContainer.rows[Number(s.dataset.y)].cells[Number(s.dataset.x)]
        cell.classList.add('valid')
        setTimeout(() => cell.classList.remove('valid'), 300)
    })
}
function pulsatingAnimation() {
    currentLine.forEach(s => {
        if (s.connections[lineRound].length < 2 || MetroCard.valto) {
            selectables.add(s.id)
            gameMapContainer.rows[s.y].cells[s.x].querySelector('.station').classList.add('pulsating-element')
        }
        else {
            gameMapContainer.rows[s.y].cells[s.x].querySelector('.station').classList.remove('pulsating-element')
            selectables.delete(s.id)
        }
    })
}
function removePulsatingAnimation() {
    connected_stations.forEach(s => {
        gameMapContainer.rows[s.y].cells[s.x].querySelector('.station').classList.remove('pulsating-element')
        selectables.delete(s.id)
    })
}

function GlowAnimation() {
    setTimeout(() => cardDisplay.querySelector(".card-face").classList.add('glow-anim'), 100)
    setTimeout(() => cardDisplay.querySelector(".card-face").classList.remove('glow-anim'), 600)
}
function animateCard() {
    GlowAnimation()
    // has_card amikor van a kezünkben van betű kártya és még nem használtuk fel 
    // váltó esetén nincs használható betűkártyánk, de az fel van fordítva
    // rotation % 360 === 0 akkor a kártya le van fordítva
    let card_is_flipped = rotation % 360 !== 0
    if ((has_card || MetroCard.valto) && card_is_flipped) {
        rotation += 180
    }
    rotation += 180
    rotateCard()
}
function rotateCard() {
    const cardBack = cardDisplay.querySelector(".card-back")
    cardDisplay.style.transform = `perspective(30rem) rotateY(${rotation}deg)`
    setTimeout(() => cardBack.innerHTML = `<div class="station black-ops-one-regular relative">${MetroCard.letter}</div>
    <svg id="card-svg">
    ${MetroCard.type === "középső" ?
            `<line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--map-bg-color)" stroke-width="10%" stroke-linecap="rounded"></line>` :
            `<line x1="15%" y1="0" x2="15%" y2="100%" stroke="var(--map-bg-color)" stroke-width="10%" stroke-linecap="rounded"></line>
    <line x1="85%" y1="0" x2="85%" y2="100%" stroke="var(--map-bg-color)" stroke-width="10%" stroke-linecap="rounded"></line>`}
    </svg>`, 300)
}
// #endregion

// #region Card
let valto_round = -1
function nextCard() {
    if (valto_round + 1 <= buildRound) {
        valto_round = -1
        MetroCard.valto = false
    }
    if (!MetroCard.valto && Math.random() > 0.7 ? true : false) {
        MetroCard.valto = true
        MetroCard.letter = "🔃"
        has_card = false
        valto_round = buildRound
        return
    } else {
        buildRound++
        has_card = true
    }
    MetroCard.next()
    //console.log(`${MetroCard.inner_count} : ${MetroCard.outer_count} | ${MetroCard.letter} ${MetroCard.valto ? "🔃" : ""} | Valto round: ${valto_round}`)
    pulsatingAnimation()
    if (MetroCard.inner_count >= 5 || MetroCard.outer_count >= 5) {
        MetroCard.reset()
        round_ended = true
        nextCardBtn.innerText = "Kör Befejezése"
    }

}

function use_up_card() {
    MetroCard.valto = false
    has_card = false
    animateCard()
    if (auto_pull) {
        handleCardPull()
    }
}

function handleCardPull() {
    pulsatingAnimation()
    if (game_ended) {
        currentPlayer.score = finalScore
        currentPlayer.time = timeS
        savePlayer(currentPlayer)
        mainMenu.style.display = "flex"
        gameContainer.style.display = "none"
    }
    else if (round_ended) {
        if (rotation % 360 !== 0) {
            rotation += 180
            rotateCard()
        }
        remove_unconnected()

        newLineRound()
        if (!game_ended) {
            nextCardBtn.innerText = "Következő Kártya"
        }
        has_card = false
    }
    else {
        nextCard()
        animateCard()
    }
}
// #endregion

// #region Score
function CalculateScore() {
    
    CurrentLineScore()
    nodeScore()
    AffectedMainStationsScore()
    const nodeScoresSum = nodeScores[0] + nodeScores[1] + nodeScores[2]
    const affectedStationsScore = (affectedMainStationsScores[affectedMainStationsIndex-1] ?? 0)
    finalScore = districtScoreSum + affectedStationsScore + nodeScoresSum
    finalSumDisplay.innerHTML = `<span class="score-number">${districtScoreSum} + ${affectedStationsScore} + ${nodeScoresSum} = ${finalScore}</span>`
}
function AffectedMainStationsScore() {
    const db = connected_stations.filter(station => station.train && station.connections.flat().length !== 0).reduce((sum, station) => sum + sum_s(station), 0)
    affectedMainStationsIndex = Math.min(affectedMainStationsScores.length-1, db)
    affectedMainStationsScoreDisplay.innerHTML = `<span class="material-symbols-outlined down-a-bit">train</span> 
    ${affectedMainStationsScores.map((s, i) => {
        return `<span class="${i >= affectedMainStationsIndex ? "inactive" : ""} metro" style="background-color: color-mix(in oklab, var(--selected-station) ${i / affectedMainStationsScores.length * 100}%, var(--M3)); padding: 0.2rem;">${s}</span>`
    }).join("")}`
}
function CurrentLineScore() {
    let PK = new Map()

    currentLine.forEach(s => {
        PK.set(s.district, (PK.get(s.district) || 0) + 1)
    })

    const PMkey = [...PK.entries()].reduce((a, b) =>
        a[1] > b[1] ? a : b
        , [0, 0])[0] 

    // Duna keresztezések
    const PD = currentLine.reduce((a,s) => a + (s.connections[lineRound-1]?.reduce((a2,s2) => a2 + (s2.side !== s.side ? 1 : 0),0) ?? 0),0) / 2

    const PM = PK.get(PMkey) || 0

    const FP = PK.size * PM + PD
    if(lineRound > 0){
        districtScoreTable[lineRound-1][0] = PK.size
        districtScoreTable[lineRound-1][1] = PM
        districtScoreTable[lineRound-1][2] = PD
        districtScoreTable[lineRound-1][3] = FP
    }

    const debug_info = ["PK", "PM", "PD", "FP"]
    //console.log("Érintett kerületek száma: ", PK.size, " Max kerület: ", PMkey, " Max db:", PK.get(PMkey), " Duna keresztezések: ", PD)
    const icons = [
        `<span class="material-symbols-outlined">background_grid_small</span>`, // districts
        `<span class="material-symbols-outlined">dataset</span>`,               // max in district
        `<span class="material-symbols-outlined">waves</span>`,                 // river
        ""
    ]
    districtScoresDisplay.innerHTML = `
    <table><tbody>${districtScoreTable.map((l, ind) => {
        return `
        <tr>
            <th class="metro score-icon">${icons[ind]}</th>
            ${l.map((v, i) => {
                return `<td for="${debug_info[ind]}" ${((ind === 3) ? 'class="text-right"' : "")} >
                <span class="metro score-number ${lines[line_order[i]].name}">${districtScoreTable[i][ind]}</span>
                <span> ${((ind === 3) ? ((i === 3) ? " = " : " + ") : "")} </span>
                </td> `  
            }).join(" ")}
        </tr>
        ${ind === 0 ? mathSymbolTr("×", 4)
        : ind === 1 ? mathSymbolTr("+", 4)
        : ind === 2 ? mathSymbolTr("=", 4)
        : ""}
        `
        }).join(" ")}
    </tbody></table>`
    districtScoreSum += FP
}
function mathSymbolTr(symbol, times, right = false) {
    return `
    <tr class="math-line">
        <th></th>
        ${[...Array(times).keys()].map((_, i) => {
            return `<td for="math" ${right ? 'class="text-right"' : ""}>${symbol}</td>`
        }).join(" ")}
    </tr>`
}
function nodeScore() {
    const nodesCount = [0,0,0]
    const touched_lines = connected_stations.map(s => sum_s(s))
    nodesCount[0] = touched_lines.filter(c => c === 2 ).length
    nodesCount[1] = touched_lines.filter(c => c === 3 ).length
    nodesCount[2] = touched_lines.filter(c => c === 4 ).length

    nodeScores[0] = nodesCount[0] * nodeMultipliers[0]
    nodeScores[1] = nodesCount[1] * nodeMultipliers[1]    
    nodeScores[2] = nodesCount[2] * nodeMultipliers[2]

    nodeScoresDisplay.innerHTML = `
    <table><tbody>
    ${nodeIcons.map((icon, ind) => {
        return `
        <tr>
             <th class="score-icon"><span>${icon}<sub>${nodeMultipliers[ind]}</sub></span></th>
             <td><span class="score-number">= ${nodesCount[ind]} × ${nodeMultipliers[ind]}</span></td>
        </tr>
         ${mathSymbolTr(`${ind === 2 ? "=" : "+"}`, 1, true)}
         `
    }).join(" ")}
    </tbody></table>`
}
// #endregion

function remove_unconnected() {
    removePulsatingAnimation()
    connected_stations = connected_stations.filter(s => s.connections.flat().length !== 0)
    currentLine = currentLine.filter(s => s.connections.flat().length !== 0)
        
    
}


// #region Timer
export function startTimer() {
    timer ??= setInterval(() => {
        timeS += 1
       renderTimeDisplay()
    }, 1000)
}
export function stopTimer() {
    clearInterval(timer)
    timer = null
}
function renderTimeDisplay() {
 const date = new Date(timeS * 1000)
        timeDisplay.innerHTML = `<time datetime="PT${date.getHours()-1}H${date.getMinutes()}M${date.getSeconds()}S">${date.toISOString().substr(11, 8)}</time>`
}
// #endregion

/*
document.addEventListener('keydown', function (event) {
  if (event.code === 'Space') {
    event.preventDefault() // optional: prevents page scrolling
    console.log("Connected: ",connected_stations)
    console.log("Current: ",currentLine)
    console.log(playerNameDisplay.innerText)
    playerNameDisplay.innerText = currentPlayer.name
  }
})

 */