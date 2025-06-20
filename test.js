const menu = document.getElementById("custom-menu");

document.addEventListener("contextmenu", function (e) {
    e.preventDefault();

    menu.classList.remove('show');
    
    setTimeout(() => {
        const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // 重設位置樣式（避免上次殘留）
    menu.style.left = '';
    menu.style.top = '';
    menu.style.right = '';
    menu.style.bottom = '';

    const useRight = e.clientX > winW - menuWidth;
    const useBottom = e.clientY > winH - menuHeight;

    if (useRight) {
    menu.style.right = `${winW - e.clientX}px`;
    } else {
    menu.style.left = `${e.clientX}px`;
    }

    if (useBottom) {
    menu.style.bottom = `${winH - e.clientY}px`;
    } else {
    menu.style.top = `${e.clientY}px`;
    }

    menu.classList.add('show');
    }, 10);
    
});

document.addEventListener("click", function () {
    menu.classList.remove('show');
    // menu.style.display = "none";
});
