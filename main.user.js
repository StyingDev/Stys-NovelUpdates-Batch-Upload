// ==UserScript==
// @name        Stys-NovelUpdates-Batch-Upload
// @namespace   Stying Scripts
// @match       https://www.novelupdates.com/add-release/
// @grant       GM_xmlhttpRequest
// @connect     www.novelupdates.com
// @version     1.2
// @author      Sty
// @licence     GNU GPL v3
// @description You know what it is, its in the name. @Stying on discord for contact
// ==/UserScript==

(function() {
    'use strict';

    // --- UI Construction ---
    const container = document.createElement('div');
    container.id = 'nu-batch-ui';
    // Style the outer container
    Object.assign(container.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '320px',
        backgroundColor: '#fff',
        border: '2px solid #333',
        zIndex: '9999',
        fontFamily: 'sans-serif',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        borderRadius: '8px',
        color: '#333',
        userSelect: 'none'
    });

    container.innerHTML = `
        <div id="nu-drag-handle" style="padding: 10px; background: rgb(44, 62, 80); color: white; cursor: move; border-top-left-radius: 5px; border-top-right-radius: 5px; font-weight: bold; display: flex;">
            <span>Sty's  NU Batch Submitter</span>
        </div>
        <div style="padding: 15px; user-select: auto;">
            <div style="margin-bottom: 10px;">
                <label style="display:block; font-size:12px; font-weight:bold;">Series Search:</label>
                <input type="text" id="nu-series-search" placeholder="Type title..." style="width: 100%; box-sizing: border-box; padding:4px;">
                <div id="nu-series-results" style="max-height: 100px; overflow-y: auto; border: 1px solid #ddd; display: none; background: #fefefe;"></div>
                <input type="hidden" id="nu-series-id">
                <small id="nu-series-selected" style="color: green; font-size:11px;"></small>
            </div>

            <div style="margin-bottom: 10px;">
                <label style="display:block; font-size:12px; font-weight:bold;">Group Search:</label>
                <input type="text" id="nu-group-search" placeholder="Type group name..." style="width: 100%; box-sizing: border-box; padding:4px;">
                <div id="nu-group-results" style="max-height: 100px; overflow-y: auto; border: 1px solid #ddd; display: none; background: #fefefe;"></div>
                <input type="hidden" id="nu-group-id">
                <small id="nu-group-selected" style="color: green; font-size:11px;"></small>
            </div>

            <div style="margin-bottom: 10px;">
                <label style="display:block; font-size:12px; font-weight:bold;">URL Template (use {n}):</label>
                <input type="text" id="nu-url-template" placeholder="https://site.com/ch-{n}" style="width: 100%; box-sizing: border-box; padding:4px;">
            </div>

            <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <label style="display:block; font-size:12px; font-weight:bold;">Start Ch:</label>
                    <input type="number" id="nu-start-ch" style="width: 100%; padding:4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; font-size:12px; font-weight:bold;">End Ch:</label>
                    <input type="number" id="nu-end-ch" style="width: 100%; padding:4px;">
                </div>
            </div>

            <button id="nu-submit-btn" style="width: 100%; padding: 10px; background: rgb(44, 62, 80); color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 4px;">Start Batch Submit</button>
            <div id="nu-status" style="margin-top: 10px; font-size: 11px; white-space: pre-wrap; height: 100px; overflow-y: auto; background: #f1f1f1; padding: 5px; border: 1px solid #ccc;">Idle...</div>
        </div>
        <style>
            .change_list { padding: 5px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px; color: #333; }
            .change_list:hover { background: #e3f2fd; }
            .search_hl { font-weight: bold; color: #d32f2f; }
        </style>
    `;
    document.body.appendChild(container);

    // --- Drag Logic ---
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    const handle = document.getElementById('nu-drag-handle');

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset.x = e.clientX - container.offsetLeft;
        offset.y = e.clientY - container.offsetTop;
        handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        container.style.left = (e.clientX - offset.x) + 'px';
        container.style.top = (e.clientY - offset.y) + 'px';
        container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        handle.style.cursor = 'move';
    });

    // --- Logging ---
    const log = (msg) => {
        const el = document.getElementById('nu-status');
        el.textContent += msg + '\n';
        el.scrollTop = el.scrollHeight;
    };

    // --- Universal AJAX Search (GM_xmlhttpRequest) ---
    function performSearch(query, type, resultDiv, idInput, selectedLabel) {
        if (query.length < 2) { resultDiv.style.display = 'none'; return; }

        GM_xmlhttpRequest({
            method: "POST",
            url: "https://www.novelupdates.com/wp-admin/admin-ajax.php",
            data: `action=nd_ajaxsearch&str=${encodeURIComponent(query)}&strID=100&strType=${type}`,
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            onload: function(response) {
                let html = response.responseText.replace(/0$/, '');
                resultDiv.innerHTML = html;
                resultDiv.style.display = 'block';

                const items = resultDiv.querySelectorAll('.change_list');
                items.forEach(item => {
                    item.onclick = function() {
                        const match = this.getAttribute('onclick').match(/'(\d+)'/g);
                        const id = match[1].replace(/'/g, '');
                        idInput.value = id;
                        selectedLabel.textContent = "Selected: " + this.textContent + " (ID: " + id + ")";
                        resultDiv.style.display = 'none';
                    };
                });
            }
        });
    }

    // --- Event Listeners ---
    document.getElementById('nu-series-search').addEventListener('input', (e) => {
        performSearch(e.target.value, 'series', document.getElementById('nu-series-results'), document.getElementById('nu-series-id'), document.getElementById('nu-series-selected'));
    });

    document.getElementById('nu-group-search').addEventListener('input', (e) => {
        performSearch(e.target.value, 'group', document.getElementById('nu-group-results'), document.getElementById('nu-group-id'), document.getElementById('nu-group-selected'));
    });

    document.getElementById('nu-submit-btn').addEventListener('click', async () => {
        const seriesId = document.getElementById('nu-series-id').value;
        const groupId = document.getElementById('nu-group-id').value;
        const urlTemplate = document.getElementById('nu-url-template').value;
        const start = parseInt(document.getElementById('nu-start-ch').value);
        const end = parseInt(document.getElementById('nu-end-ch').value);

        if (!seriesId || !groupId || !urlTemplate || isNaN(start) || isNaN(end)) {
            alert("Please fill all fields and select items from search results.");
            return;
        }

        document.getElementById('nu-submit-btn').disabled = true;
        document.getElementById('nu-status').textContent = "Starting batch...\n";

        for (let i = start; i <= end; i++) {
            const chUrl = urlTemplate.replace('{n}', i);
            log(`Submitting Ch ${i}...`);

            const postData = `artitle=${seriesId}&arrelease=c${i}&arlink=${encodeURIComponent(chUrl)}&argroup=${groupId}&ardate=&submit=Submit`;

            await new Promise(resolve => {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://www.novelupdates.com/add-release/",
                    data: postData,
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    onload: function(res) {
                        log(res.status === 200 ? `Ch ${i} Sent` : `Ch ${i} Failed (${res.status})`);
                        resolve();
                    },
                    onerror: () => { log(`Error on Ch ${i}`); resolve(); }
                });
            });

            if (i < end) {
                log(`Waiting 3s...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        log("Batch Processing Finished!");
        document.getElementById('nu-submit-btn').disabled = false;
    });

})();
