export function savePlayer(player) {
    const list = JSON.parse(localStorage.getItem("leaderboard")) || [];
    list.push({
        name: player.name,
        score: player.score,
        time: player.time
    });

    // Optional: always sort — high score first, then time
    list.sort((a, b) =>
        b.score - a.score || a.time - b.time
    );

    localStorage.setItem("leaderboard", JSON.stringify(list));
    loadLeaderboard()
}

export function loadLeaderboard() {
    const tbody = document.querySelector("#leaderboard tbody");
    const list = JSON.parse(localStorage.getItem("leaderboard")) || [];
    if(list.length === 0) {
        tbody.innerHTML = `
         <tr>
        <td>-</td>
        <td>0</td>
        <td><time datetime="PT0H0M0}S">00:00:00</time></td>
        </tr>
        `
        return
    }
    tbody.innerHTML = list.map(player => {
        const date = new Date(player.time * 1000)
        return `
        <tr>
        <td>${player.name}</td>
        <td>${player.score}</td>
        <td><time datetime="PT${date.getHours()-1}H${date.getMinutes()}M${date.getSeconds()}S">${date.toISOString().substr(11, 8)}</time></td>
        </tr>
        `}
    ).join(" ");
}