const colors = ["#538d4e", "#b59f3b", "#3a3a3c", "#565758", "#d7dadc"];

export function createConfetti(count: number = 50) {
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = Math.random() * 8 + 4 + "px";
    confetti.style.height = confetti.style.width;
    confetti.style.borderRadius = "50%";
    confetti.style.animation = `confetti-fall ${Math.random() * 1 + 2.5}s ease-in forwards`;
    confetti.style.animationDelay = Math.random() * 0.3 + "s";
    confetti.style.zIndex = "9999";

    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), 4000);
  }
}
