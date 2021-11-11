import axios from "axios";
import prettyBytes from "pretty-bytes";
import setupEditors from "./setupEditor.js";

const form = document.querySelector('[data-form]')
const queryParamsContainer = document.querySelector('[data-query-params]')
const requestHeadersContainer = document.querySelector('[data-request-headers]')
const keyValueTemplate = document.querySelector('[data-key-value-template]')
const responseHeadersContainer = document.querySelector('[data-response-headers]')

document.querySelector('[data-add-query-param-btn]').addEventListener('click', () => {
    queryParamsContainer.append(createKeyValuePair())
})

document.querySelector('[data-add-request-header-btn]').addEventListener('click', () => {
    requestHeadersContainer.append(createKeyValuePair())
})

queryParamsContainer.append(createKeyValuePair())
requestHeadersContainer.append(createKeyValuePair())

axios.interceptors.request.use(request => {
    request.customData = request.customData || {}
    request.customData.startTime = new Date().getTime()
    return request
})

function updateEndTime(response) {
    response.customData = response.customData || {}
    response.customData.time = new Date().getTime() - response.config.customData.startTime
    return response
}

axios.interceptors.response.use(updateEndTime, e => {
    return Promise.reject(updateEndTime(e.response))
})

const { requestEditor, updateResponseEditor } = setupEditors()

form.addEventListener('submit', e => {
    e.preventDefault()

    document.querySelector('[data-response-section]').classList.add('is-hidden')

    let data
    try {
        data = JSON.parse(requestEditor.state.doc.toString() || null)
    } catch (e) {
        alert('JSON data is malformed')
        return
    }

    axios({
        url: document.querySelector('[data-url]').value,
        method: document.querySelector('[data-method]').value,
        params: keyValuePairsToObjects(queryParamsContainer),
        headers: keyValuePairsToObjects(requestHeadersContainer),
        data,
    })
        .catch(error => error)
        .then(response => {
            document.querySelector('[data-response-section]').classList.remove('is-hidden')
            updateResponseDetails(response)
            updateResponseEditor(response.data)
            updateResponseHeaders(response.headers)

            console.log(response)
    })
})

function updateResponseDetails(details) {
    document.querySelector('[data-status]').textContent = details.status
    document.querySelector('[data-time]').textContent = details.customData.time
    document.querySelector('[data-size]').textContent = prettyBytes(
        JSON.stringify(details.data).length + JSON.stringify(details.headers).length
    )

}

function updateResponseHeaders(headers) {
    responseHeadersContainer.innerHTML = ''
    Object.entries(headers).forEach(([key, value]) => {
        const keyElement = document.createElement('div')
        keyElement.textContent = key
        responseHeadersContainer.append(keyElement)
        const valueElement = document.createElement('div')
        valueElement.textContent = value
        responseHeadersContainer.append(valueElement)
    })
}

function createKeyValuePair() {
    const element = keyValueTemplate.content.cloneNode(true)
    element.querySelector('[data-remove-btn]').addEventListener('click', (e) => {
        e.target.closest('[data-key-value-pair]').remove()
    })
    return element
}

function keyValuePairsToObjects(container) {
    const pairs = container.querySelectorAll('[data-key-value-pair]')
    return [...pairs].reduce((data,pair) => {
        const key = pair.querySelector('[data-key]').value
        const value = pair.querySelector('[data-value]').value

        if (key === '') return data
        return {...data, [key]: value }
    }, {})
}

// tabs

const tabs = document.querySelectorAll('.tabs-request li');
const tabContentBoxes = document.querySelectorAll('#tab-content > div');

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        tabs.forEach((tab) => {
            tab.classList.remove('is-active')
        })
        tab.classList.add('is-active')
        const target = tab.querySelector('a').dataset.target;
        tabContentBoxes.forEach(box => {
            if (box.getAttribute('id') === target) {
                box.classList.remove('is-hidden');
            } else {
                box.classList.add('is-hidden');
            }
        })
    })
})

const tabsRes = document.querySelectorAll('.tabs-response li');
const responseBoxes = document.querySelectorAll('#response-content > div');

tabsRes.forEach((tabRes) => {
    tabRes.addEventListener('click', () => {
        tabsRes.forEach((tabRes) => {
            tabRes.classList.remove('is-active')
        })
        tabRes.classList.add('is-active')
        const targetRes = tabRes.querySelector('a').dataset.target;
        responseBoxes.forEach(boxRes => {
            if (boxRes.getAttribute('id') === targetRes) {
                boxRes.classList.remove('is-hidden');
            } else {
                boxRes.classList.add('is-hidden');
            }
        })
    })
})


/* Favourites Section - Getting favourite API Request Cards */

// fav cards


const cardsContainer = document.querySelector('.fav-cards')
let favCards = []
_refreshFavCards()
checkLocalStorage()

const apiFavUrl = document.querySelector('[data-url-fav]')
apiFavUrl.addEventListener('click', () => apiFavUrl.value = "https://")

const addFavButton = document.querySelector('[data-add-fav]')
addFavButton.addEventListener('click', (e) => {
    e.preventDefault()
    saveFavCard()
    _refreshFavCards()
})

function deleteCard(cardId) {
    const newCards = favCards.filter((cards) => cards.id != cardId)
    localStorage.setItem('fav-cards', JSON.stringify(newCards))
    _refreshFavCards()
}

function getAllFavCards() {
    return JSON.parse(localStorage.getItem('fav-cards') || "[]")
}

function checkLocalStorage() {
    const localStorageCheck = JSON.parse(localStorage.getItem('fav-cards') || null)
    if (localStorageCheck === null) {
        const defId = 99999
        const defMethod = "GET"
        const defUrl = "https://jsonplaceholder.typicode.com/todos/1"
        const defInfo = "This is default fav card"
        const defaultCard = createFavCard(defId, defMethod, defUrl, defInfo);
        cardsContainer.innerHTML = ''
        cardsContainer.insertAdjacentHTML("beforeend", defaultCard)

        const defCard = {}
        defCard.id = defId
        defCard.method = defMethod
        defCard.url = defUrl
        defCard.info = defInfo

        favCards.push(defCard)
        localStorage.setItem('fav-cards', JSON.stringify(favCards))
    }
    _refreshFavCards()
}

function _refreshFavCards() {
    const refreshedCards = getAllFavCards()
    _setFavCards(refreshedCards)

    if (favCards === []) {
        cardsContainer.innerHTML = '<div>Add some favourite below</div>'
    } else {
        cardsContainer.innerHTML = ''
        for (const card of favCards) {
            const html = createFavCard(card.id, card.method, card.url, card.info)
            cardsContainer.insertAdjacentHTML("beforeend", html)
        }
    }


    if (favCards.length === 0) {
        cardsContainer.innerHTML = '<div>Add your favourite API requests below</div>'
    } else {
        cardsContainer.innerHTML = ''

        for (const card of favCards) {
            const html = createFavCard(card.id, card.method, card.url, card.info)
            cardsContainer.insertAdjacentHTML("beforeend", html)
        }
        document.querySelectorAll('.fa-times').forEach((el) => {
            el.addEventListener('click', () => deleteCard(el.getAttribute('data-id')))
        })

    }

    const cards = document.querySelectorAll('.fav-cards .card')
    const methods = document.querySelectorAll('[data-method] option')

    cards.forEach((card) => {
        const method = card.querySelector('[data-card-method]').textContent
        const url = card.querySelector('[data-card-url]').textContent
        const apiUrl = document.querySelector('[data-url]')
        card.addEventListener('click', () => {
            apiUrl.value = url

            methods.forEach((option) => {
                if (option.value === method) {
                    option.selected = "selected";
                }
            })

        })
    })

}

function _setFavCards(cards) {
    favCards = cards;
}

function saveFavCard() {
    const newCard = {}

    const favMethod = document.querySelector('[data-method-fav]').value
    const favUrl = document.querySelector('[data-url-fav]').value
    const favInfo = document.querySelector('[data-info-fav]').value

    newCard.id = Math.floor(Math.random() * 1000000)
    newCard.method = favMethod
    newCard.url = favUrl
    newCard.info = favInfo

    favCards.push(newCard)

    localStorage.setItem('fav-cards', JSON.stringify(favCards))
}

function createFavCard(id, method, url, info="") {

    let methodColor = "";
    switch (method) {
        case "GET":
            methodColor = "has-text-info";
            break;
        case "POST":
            methodColor = "has-text-success";
            break;
        case "PUT":
            methodColor = "has-text-warning";
            break;
        case "PATCH":
            methodColor = "has-text-warning-dark";
            break;
        case "DELETE":
            methodColor = "has-text-danger";
            break;
        default:
            methodColor = "has-text-black";
    }

    return `
        <div class="card my-2 fav-item" data-card-id="${id}">
            <header class="card-header py-1 px-2 is is-flex is-justify-content-space-between">
                <p class="header-title is-size-7 ${methodColor}" data-card-method>${method}</p>
                <span class="is-italic ml-1 is-size-7" data-card-url>${url}</span>
                <span class="icon">
                    <i class="fas fa-times" data-id="${id}" aria-hidden="true"></i>
                </span>
            </header>
            <div class="card-content py-1 px-2 is-size-7 has-background-grey-lighter" data-card-info>
                ${info}
            </div>
        </div>
    `
}

