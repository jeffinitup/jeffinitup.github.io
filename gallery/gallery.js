// gallery.js

let currentMediaIndex = 0;
let currentProjectId = null;
let projects = [{
    // Here just for autocomplete/types
    id: "",
    type: "",
    lang: "",
    status: "",
    preview_ext: "",
    start_date: "",
    end_date: "",
    description: [""],
    links: [""],
    media: [""]
}];

// Prepares the main list within the project tab
async function init() {
    initListeners();

    // Get contents from the projects json
    try {
        const response = await fetch('/gallery/projects.json');
        projects = await response.json();
    } catch (error) {
        console.error("Failed to load projects JSON:", error);
        return;
    }

    projects.sort((a, b) => {
        // Prioritize the end date if it exists
        const dateA = new Date(a.end_date ? a.end_date : a.start_date).getTime();
        const dateB = new Date(b.end_date ? b.end_date : b.start_date).getTime();
        return dateB - dateA;
    });

    const grid = document.getElementById('project-grid');
    grid.innerHTML = '';

    projects.forEach(project => {
        // Card
        const card = document.createElement('div');
        card.className = 'project-card';
        card.onclick = () => showProject(project.id);

        // Image metadata and tags
        const ext = project.preview_ext || "png";
        const imagePath = `/gallery/preview/${project.id}.${ext}`;
        let tagsHtml = parseTags(project, 'div');

        // Put it all together
        card.innerHTML = `
            <div id="preview-container-${project.id}">
                <div class="card-image placeholder-image">...</div>
            </div>
            <div class="card-text">
                <h3 style="margin: 0 0 8px 0;">${project.title}</h3>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <small style="color: #666;">${formatProjectDate(project)}</small> 
                    ${tagsHtml}
                </div>
            </div>
        `;

        grid.appendChild(card);

        // Add the image to the preview
        hasFile(imagePath).then(exists => {
            if (exists) {
                const container = document.getElementById(`preview-container-${project.id}`);
                if (container) {
                    container.innerHTML = `<img src="${imagePath}" alt="${project.title} preview" class="card-image">`;
                }
            }
        });
    });
}

function initListeners() {
    const fsButtonLeft = document.getElementById("fs-prev-button");
    const fsButtonRight = document.getElementById("fs-next-button");
    const fsMedia = document.getElementById("fs-media")
    
    fsButtonLeft.addEventListener("click", ev => changeFullscreenMedia(-1, ev));
    fsButtonRight.addEventListener("click", ev => changeFullscreenMedia(1, ev));
    // This is to stop the fullscreen modal from closing itself when clicking the displayed image
    fsMedia.addEventListener("click", ev => ev.stopPropagation());
}

// Called when clicking on an entry in the main list
function showProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    // Set state for the carousel
    currentProjectId = id;
    currentMediaIndex = 0;

    document.getElementById('detail-title').innerText = project.title;
    document.getElementById('detail-date').innerText = formatProjectDateFull(project);
    document.getElementById('detail-tag').innerHTML = parseTags(project, 'span');

    // Add paragraphs for each desc
    const descDiv = document.getElementById('detail-description');
    descDiv.innerHTML = '';
    if (project.description && project.description.length > 0) {
        project.description.forEach(contents => {
            descDiv.innerHTML += `<p>${contents}</p>`
        });
    }

    // Add buttons for each link
    const linksDiv = document.getElementById('detail-links');
    linksDiv.innerHTML = '';
    if (project.links && project.links.length > 0) {
        project.links.forEach(link => {
            linksDiv.innerHTML += `<a href="${link.url}" class="link-button">${link.label}</a>`;
        });
    }

    // Render the initial media caroussel
    renderCarousel();
    document.getElementById('gallery-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
}

// Renders the embed carousel for the current project
function renderCarousel() {
    const project = getProjectFromID(currentProjectId);
    const mediaDiv = document.getElementById('detail-media');

    mediaDiv.innerHTML = '';
    mediaDiv.className = '';

    if (!project || !project.media || project.media.length === 0) {
        return; // Nothing to show lel
    }

    const item = project.media[currentMediaIndex];
    let mediaHtml = parseMedia(project, item);

    // Arrows only show up if there is more than one item in the carousel
    const altText = `<div class="carousel-overlay alt-text">${project.media[currentMediaIndex].alt}</div>`;
    const controlsHtml = project.media.length > 1 ? `
        <button class="carousel-btn prev" onclick="changeMedia(-1)">&#10094;</button>
        <button class="carousel-btn next" onclick="changeMedia(1)">&#10095;</button>
        <div class="carousel-overlay page">${currentMediaIndex + 1} / ${project.media.length}</div>
        ${altText}` :
        `${altText}`;

    mediaDiv.innerHTML = `
        <div class="carousel-container">
            ${mediaHtml}
            ${controlsHtml}
        </div>
    `;
}

function parseTags(project, kind) {
    let tagsHtml = '';

    if (project.type) tagsHtml += `<${kind} class="bordered-label tag">${project.type}</${kind}>`;
    if (project.lang) tagsHtml += `<${kind} class="bordered-label tag">${project.lang}</${kind}>`;
    if (project.status) {
        const statusClass = `bordered-label tag ${project.status.toLowerCase()}`
        tagsHtml += `<${kind} class='${statusClass}'>${project.status}</${kind}>`;
    }
    return tagsHtml;
}

function parseMedia(project, item) {
    switch (item.type) {
        case 'image':
            const imgSrc = `/gallery/media/${project.id}/${item.url}`;
            const imgAltText = item.alt ? `${item.alt}` : '';

            return `<img src="${imgSrc}" alt="${imgAltText}" class="carousel-item" style="cursor: zoom-in;" onclick="openFullscreen()">`;
        case 'video':
            const videoSrc = `/gallery/media/${project.id}/${item.url}`;

            return `
            <video controls class="carousel-item">
                <source src="${videoSrc}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;
        case 'embed':
            let embedUrl = item.url;

            if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
                // Parse yt links to be their proper embed ones
                const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
                const match = embedUrl.match(regExp);

                if (match && match[1]) {
                    embedUrl = `https://www.youtube.com/embed/${match[1]}`;
                }
            }

            return `
            <iframe 
                class="carousel-item" 
                src="${embedUrl}" 
                title="${item.alt || 'Video embed'}" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>`;
        default:
            return '';
    }
}

// Switches the current display within the media carousel
function changeMedia(direction) {
    const project = getProjectFromID(currentProjectId);
    if (!project || !project.media) return;

    const max = project.media.length;
    currentMediaIndex += direction;
    currentMediaIndex = ((currentMediaIndex % max) + max) % max;

    renderCarousel();
}

// Opens the image in a fullscreen overlay
function openFullscreen() {
    const project = getProjectFromID(currentProjectId);
    const item = project.media[currentMediaIndex];
    if (!item || item.type !== 'image') return;

    setFullscreenMedia(project, item);
    setFullscreenVisibility(true);
}

// Navigates media while in fullscreen
function changeFullscreenMedia(direction, event) {
    // Prevent the click from hitting the background and closing the modal
    if (event) event.stopPropagation();
    const project = getProjectFromID(currentProjectId);
    if (!project || !project.media) return;

    changeMedia(direction);

    const item = project.media[currentMediaIndex];
    if (item.type !== 'image') {
        // Close out if we're not looking at an image anymore
        closeFullscreen();
        return;
    }

    setFullscreenMedia(project, item);
}

function setFullscreenMedia(project, item) {
    const modalImg = document.getElementById('fs-media');
    const modalAltText = document.getElementById('fullscreen-alt-text');

    modalImg.src = `/gallery/media/${project.id}/${item.url}`;
    modalAltText.innerHTML = item.alt || '';
}

function setFullscreenVisibility(visible) {
    const modal = document.getElementById('fullscreen-modal');
    visible ? modal.classList.remove('hidden') : modal.classList.add('hidden');
}

// Closes the fullscreen overlay
function closeFullscreen() {
    const modal = document.getElementById('fullscreen-modal');
    const modalImg = document.getElementById('fs-media');
    const modalAltText = document.getElementById('fullscreen-alt-text');

    modal.classList.add('hidden');
    modalAltText.innerHTML = '';
    modalImg.src = '';
}

function showGallery() {
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('gallery-view').classList.remove('hidden');
    // Need to do this to prevent vids from playing when out of view
    document.getElementById('detail-media').innerHTML = '';
}

function formatProjectDate(project) {
    return project.end_date ? project.end_date : project.start_date;
}

function formatProjectDateFull(project) {
    return project.end_date ? `${project.start_date} to ${project.end_date}` : `${project.start_date} to present`;
}

function getProjectFromID(id) {
    return projects.find(project => project.id === id);
}

async function hasFile(url) {
    try {
        const response = await fetch(url, { method : "HEAD" });
        return response.ok;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// Start the app
init();