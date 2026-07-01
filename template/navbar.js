const NAV_FORMAT = "nav_";
const page = NAV_FORMAT + document.title.toLowerCase();

document.addEventListener("DOMContentLoaded", onContentLoaded);

function onContentLoaded() {
    fetch('template/navbar.html')
        .then(response => response.text())
        .then(data => document.getElementById("navbar-container").innerHTML = data)
        .then(_ => {
            let navigation = document.querySelectorAll(".element");
            navigation.forEach(element => {
                if (element.id === page) {
                    const tag = document.createElement('u');
                    element.parentElement.insertBefore(tag, element);
                    tag.appendChild(element)
                }
            })
        });

    console.log("Test");
}

