function spawnParticles(count = 40) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement("div");
        p.className = "particle";

        const size = Math.random() * 6 + 3;
        p.style.width = size + "px";
        p.style.height = size + "px";

        p.style.left = Math.random() * 100 + "vw";
        p.style.top = Math.random() * 100 + "vh";

        p.style.animationDuration = (6 + Math.random() * 10) + "s";
        p.style.animationDelay = Math.random() * 5 + "s";

        document.body.appendChild(p);
    }
}

window.spawnParticles = spawnParticles;
