export function rnd_range(min,max){
    return Math.trunc(Math.random() * (max-min+1)) + min;
}

export function shuffle(array) {
  let currentIndex = array.length
  while (currentIndex != 0) {

    let randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }
}