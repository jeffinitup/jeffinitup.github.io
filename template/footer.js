document.addEventListener("DOMContentLoaded", onContentLoaded);

function onContentLoaded() {
    fetch("template/footer.html")
        .then(response => response.text())
        .then(data => document.getElementById("footer-container").innerHTML = data);
}
