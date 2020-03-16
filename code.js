const X_SPACING = 100

// core functions
function createStand(node, id) {
    let stand = getSavedStand(id)
    let offset = 0
    let bufferNodes = []
    stand.variations.forEach((variation, index) => {
        let newNode = createVariation(node, variation, offset)
        offset += variation.width + X_SPACING
        bufferNodes.push(newNode)
    })

    return bufferNodes
}

function createVariation(node, variation, offset) {
    let newNode
    let {width, height, name} = variation
    if (node) {
        newNode = (node.type === 'COMPONENT') ? node.createInstance() : node.clone();
        newNode.name = (name) ? `${node.name}-${name}` : `${node.name}-${width}x${height}`;
        newNode.x = node.x + node.width + X_SPACING + (offset || 0)
        newNode.y = node.y
    } else {
        newNode = figma.createFrame()
        if (name) newNode.name = name
        newNode.x = figma.viewport.bounds.x + (figma.viewport.bounds.width/2) + X_SPACING + (offset || 0)
        newNode.y = figma.viewport.bounds.y + (figma.viewport.bounds.height/2)
    }

    newNode.resize(width, height)

    return newNode
}

function dumpBoutique() {
    figma.root.setPluginData('boutique', '')
}

function saveBoutique(boutique) {
    figma.root.setPluginData('boutique', JSON.stringify(boutique))
}

function getSavedBoutique() {
    let boutique = figma.root.getPluginData('boutique');
    return (boutique === '') ? [] : JSON.parse(boutique);
}

function getSavedStand(standId) {
    let boutique = getSavedBoutique()
    return boutique[standId]
}

function editStand(standId, name) {
    let boutique = getSavedBoutique()
    let stand = boutique[standId]
    stand.name = name
    saveBoutique(boutique)
    return { standId, stand }
}

function editVariation(standId, variationId, width, height) {
    let boutique = getSavedBoutique()
    boutique[standId].variations[variationId] = { width: width, height: height }
    saveBoutique(boutique)
    return { standId: standId, variationId: variationId, width: width, height: height }
}

function addStand(name) {
    let boutique = getSavedBoutique()
    boutique.splice(0, 0, { name, variations: [] })
    saveBoutique(boutique)
    return { boutique }
}

function addVariation(standId, width, height) {
    let boutique = getSavedBoutique()
    let stand = boutique[standId]
    stand.variations.splice(0, 0, { width, height })
    saveBoutique(boutique)
    return { standId, stand }
}

function getSavedVariation(standId, variationId) {
    let stand = getSavedStand(standId)
    return stand.variations[variationId]
}

function removeStand(standId) {
    let boutique = getSavedBoutique()
    let stand =  boutique.splice(standId, 1)
    saveBoutique(boutique)
    return boutique
}

function removeVariation(standId, variationId) {
    let boutique = getSavedBoutique()
    let stand =  boutique[standId]
    stand.variations.splice(variationId, 1)
    saveBoutique(boutique)
    return {standId, stand }
}

function renderFromSavedState() {
    var boutique = getSavedBoutique()
    if (boutique.length === 0) {
        figma.ui.postMessage({ type: 'empty' })
    } else {
        figma.ui.postMessage({ type: 'render', boutique: boutique })
    }
}


// Get saved config and render UI
figma.showUI(__html__, {width: 320, height: 480})
renderFromSavedState()


// Listen for actions in the UI
figma.ui.onmessage = msg => {

    if (msg.type === 'run-stand') {
        let source = figma.currentPage.selection
        if (source.length == 0) {
            let newNodes = createStand(null, msg.standId)
            figma.currentPage.selection = newNodes
            figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection)
        } else {
            source.forEach(node => {
                createStand(node, msg.standId)
            })
        }
        figma.notify('🕺 Frametastic!')
    }

    if (msg.type === 'run-variation') {
        let source = figma.currentPage.selection
        let variation = getSavedVariation(msg.standId, msg.variationId)
        if (source.length == 0) {
            let newNode = createVariation(null, variation)
            figma.currentPage.selection = [newNode]
            figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection)
        } else {
            source.forEach(node => {
                createVariation(node, variation)
            })
        }
        figma.notify('🕺 Frametastic!')
    }

    if (msg.type === 'request-import') {
        let boutique = msg.data
        saveBoutique(boutique)
        renderFromSavedState()
    }

    if (msg.type === 'request-export') {
        let boutique = getSavedBoutique()
        figma.ui.postMessage({ type: 'export-data', data: boutique })
    }

    if (msg.type === 'request-dump') {
        saveBoutique([])
        renderFromSavedState()
    }

    if (msg.type === 'remove-stand') {
        let boutique = removeStand(msg.standId)
        renderFromSavedState()
    }

    if (msg.type === 'remove-variation') {
        let {standId, stand} = removeVariation(msg.standId, msg.variationId)
        figma.ui.postMessage({ type: 'removed-variation', standId, stand })
    }

    if (msg.type === 'edit-stand') {
        let { standId, stand } = editStand(msg.standId,msg.name)
        figma.ui.postMessage({ type: 'edited-stand', standId, stand })
    }

    if (msg.type === 'edit-variation') {
        let variation = editVariation(msg.standId, msg.variationId, msg.width, msg.height)
        figma.ui.postMessage({ type: 'edited-variation', variation })
    }

    if (msg.type === 'add-stand') {
        let boutique = addStand(msg.name)
        renderFromSavedState()
    }

    if (msg.type === 'add-variation') {
        let {standId, stand} = addVariation(msg.standId, msg.width, msg.height)
        figma.ui.postMessage({ type: 'added-variation', standId, stand })
    }

    // figma.closePlugin();
};
