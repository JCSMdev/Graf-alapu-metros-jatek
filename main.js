import * as Renderer from "./Game/renderer.js"
import Player, { Station } from "./Game/gameClasses.js"
import { loadLeaderboard } from "./Game/localStorageHandler.js"
const { startNewGame, handleStationSelect } = Renderer
// localStorage.setItem("leaderboard", JSON.stringify([]));
loadLeaderboard()
// #region Főmenü
const gameForm = document.querySelector('#gameForm')

Renderer.mainMenu.style.display = "flex"
const playerNameInput = document.querySelector('#playerName')
playerNameInput.addEventListener('input', function(event) {
  if (this.validity.patternMismatch && this.value !== "") {
    this.setCustomValidity("Csak az ABC betűit és számokat használj")
  } else {
    this.setCustomValidity("")
  }
  this.nextElementSibling.innerHTML = this.validationMessage
})

let currentPlayer = new Player("unnamed")


// #endregion

// #region EVENT LISTENERS
Renderer.gameMapContainer.addEventListener('click', function (event) {
    if (event.target.matches('td') && !Renderer.game_ended) {
      if(Number(event.target.dataset.id) === -1) {return;}
      const station = new Station(
                                  Number(event.target.dataset.id), 
                                  Number(event.target.dataset.x), 
                                  Number(event.target.dataset.y), 
                                  event.target.dataset.type,
                                  event.target.dataset.train === "true",
                                  event.target.dataset.side,
                                  Number(event.target.dataset.district)
                                 )
    handleStationSelect(station)
  }
})

gameForm.addEventListener('submit',function(event) {
    event.preventDefault()

    currentPlayer.name = getPlayerName()
    if(currentPlayer.name === null) {return;}
    currentPlayer.name = playerNameInput.value.trim();
    Renderer.playerNameDisplay.innerText =  currentPlayer.name
    

    mainMenu.style.display = "none"
    startNewGame(currentPlayer)
    
})
// #endregion



function getPlayerName() {
    const playerName = playerNameInput.value.trim()
    if(playerName === "" || !playerNameInput.checkValidity()) {
        playerNameInput.value = ""
        return null
    }
    playerNameInput.value = playerName
    return playerName
}


const popupOverlay = document.querySelector("#description-overlay");
const helpBtn = document.querySelector("#help-btn");
const closeBtn = document.querySelector("#close-popup");
let popup_opened = false;
function togglePopup() {
    popupOverlay.style.display =
        popupOverlay.style.display === "flex" ? "none" : "flex";
        popup_opened = !popup_opened
        if(Renderer.game_ended) return
        if(popup_opened) {
          Renderer.stopTimer()
        } else {
          Renderer.startTimer()
        }
}

helpBtn.addEventListener("click", togglePopup);
closeBtn.addEventListener("click", togglePopup);
popupOverlay.addEventListener("click", e => {
    if (e.target === popupOverlay) togglePopup(); // click outside closes
});