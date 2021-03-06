let _ = require('lodash')
let d3 = require('d3')
let { wrapText, helpers, covertImageToBase64 } = require('../utils')
let renderLines = require('./renderLines')
let exportOrgChartImage = require('./exportOrgChartImage')
let exportOrgChartPdf = require('./exportOrgChartPdf')
let onClick = require('./onClick')
let iconLink = require('./components/iconLink')
let supervisorIcon = require('./components/supervisorIcon')

let addBtn = require('./components/AddButton')
let delBtn = require('./components/DeleteButton')
let editBtn = require('./components/EditButton')
let deltBtn = require('./components/DeleteButton')
let orgChartIcon = require('./components/OrgChartIcon')
let checkBox = require('./components/CheckBox')

const CHART_NODE_CLASS = 'org-chart-node'
const ENTITY_LINK_CLASS = 'org-chart-entity-link'
const ENTITY_NAME_CLASS = 'org-chart-entity-name'
const ENTITY_TITLE_CLASS = 'org-chart-entity-title'
const ENTITY_SUB_TITLE_CLASS = 'org-chart-entity-sub-title'
const ENTITY_HIGHLIGHT = 'org-chart-entity-highlight'
const COUNTS_CLASS = 'org-chart-counts'

const ENTITY_BTN_CLASS = 'org-chart-btn'

function render(config) {
  const {
    svgroot,
    svg,
    tree,
    animationDuration,
    nodeWidth,
    nodeHeight,
    nodePaddingX,
    nodePaddingY,
    nodeBorderRadius,
    backgroundColor,
    nameColor,
    titleColor,
    reportsColor,
    borderColor,
    avatarWidth,
    lineDepthY,
    treeData,
    sourceNode,
    onEntityLinkClick,
    loadImage,
    downloadImageId,
    downloadPdfId,
    elemWidth,
    margin,
    onConfigChange,
    nameFontSize = 14,
    titleFontSize = 13,
    titleYTopDistance = 42,
    subTitleFontSize = 12,
    subtitleYTopDistance = 63,
    countFontSize = 14,
    countYTopDistance = 72,
    maxNameWordLength = 16,
    maxTitleWordLength = 17,
    maxSubTitleWordLength = 19,
    maxCountWordLength = 17,
    getName,
    getTitle,
    getSubTitle,
    getCount,
    onNameClick,
    onTitleClick,
    onSubTitleClick,
    onCountClick,
    onCreate,
    onEdit,
    onDelete,
  } = config

  // Compute the new tree layout.
  let nodes = tree.nodes(treeData).reverse()
  let links = tree.links(nodes)

  config.links = links
  config.nodes = nodes

  // Normalize for fixed-depth.
  nodes.forEach(function(d) {
    d.y = d.depth * lineDepthY
  })

  // Update the nodes
  let node = svg.selectAll('g.' + CHART_NODE_CLASS).data(
    nodes.filter(d => d.id),
    d => d.id
  )

  let parentNode = sourceNode || treeData

  svg.selectAll('#supervisorIcon').remove()

  supervisorIcon({
    svg: svg,
    config,
    treeData,
    x: 70,
    y: -24,
  })

  // Enter any new nodes at the parent's previous position.
  let nodeEnter = node
    .enter()
    .insert('g')
    .attr('class', CHART_NODE_CLASS)
    .attr('transform', `translate(${parentNode.x0}, ${parentNode.y0})`)
    .on('click', onClick(config))
    .on('mouseover', function (d, i) {
      d3.select(this).selectAll('.' + ENTITY_BTN_CLASS).style('display', 'block')
    })
    .on('mouseout', function (d, i) {
      d3.select(this).selectAll('.' + ENTITY_BTN_CLASS).style('display', 'none')
    })

  // Entity Card Shadow
  nodeEnter
    .append('rect')
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('fill', backgroundColor)
    .attr('stroke', borderColor)
    .attr('rx', nodeBorderRadius)
    .attr('ry', nodeBorderRadius)
    .attr('fill-opacity', 0.05)
    .attr('stroke-opacity', 0.025)
    .attr('filter', 'url(#boxShadow)')

  // Entity Card Container
  nodeEnter
    .append('rect')
    .attr('class', d => (d.isHighlight ? `${ENTITY_HIGHLIGHT} box` : 'box'))
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('id', d => d.id)
    .attr('fill', backgroundColor)
    .attr('stroke', borderColor)
    .attr('rx', nodeBorderRadius)
    .attr('ry', nodeBorderRadius)
    .style('cursor', helpers.getCursorForNode)

  let namePos = {
    x: nodeWidth / 2,
    y: nodePaddingY * 1.8 + avatarWidth,
  }

  let avatarPos = {
    x: nodeWidth / 2 - avatarWidth / 2,
    y: nodePaddingY / 2,
  }

  // Entity's Name
  nodeEnter
    .append('text')
    .attr('class', `${ENTITY_NAME_CLASS} unedited`)
    .attr('x', namePos.x)
    .attr('y', namePos.y)
    .attr('dy', '.3em')
    .style('cursor', 'pointer')
    .style('fill', nameColor)
    .style('font-size', nameFontSize)
    .text(d => _.isFunction(getName) ? getName(d) : helpers.getName(d))
    .on('click', helpers.customOnClick(onNameClick, onClick, config))

  // Title
  nodeEnter
    .append('text')
    .attr('class', `${ENTITY_TITLE_CLASS} unedited`)
    .attr('x', nodeWidth / 2)
    .attr('y', namePos.y + nodePaddingY + titleYTopDistance)
    .attr('dy', '0.1em')
    .style('font-size', titleFontSize)
    .style('cursor', 'pointer')
    .style('fill', titleColor)
    .text(d => _.isFunction(getTitle) ? getTitle(d) : helpers.getTitle(d))
    .on('click', helpers.customOnClick(onTitleClick, onClick, config))

  // SubTitle
  nodeEnter
  .append('text')
  .attr('class', `${ENTITY_SUB_TITLE_CLASS} unedited`)
  .attr('x', nodeWidth / 2)
  .attr('y', namePos.y + nodePaddingY + subtitleYTopDistance)
  .attr('dy', '0.1em')
  .style('font-size', subTitleFontSize)
  .style('cursor', 'pointer')
  .style('fill', titleColor)
  .text(d => _.isFunction(getSubTitle) ? getSubTitle(d) : helpers.getSubTitle(d))
  .on('click', helpers.customOnClick(onSubTitleClick, onClick, config))

  // Entity's Avatar
  nodeEnter
    .append('image')
    .attr('id', d => `image-${d.id}`)
    .attr('width', avatarWidth)
    .attr('height', avatarWidth)
    .attr('x', avatarPos.x)
    .attr('y', avatarPos.y)
    .attr('stroke', borderColor)
    .attr('s', d => {
      d.entity.hasImage
        ? d.entity.avatar
        : loadImage(d).then(res => {
            covertImageToBase64(res, function(dataUrl) {
              d3.select(`#image-${d.id}`).attr('href', dataUrl)
              d.entity.avatar = dataUrl
            })
            d.entity.hasImage = true
            return d.entity.avatar
          })
    })
    .attr('src', d => d.entity.avatar)
    .attr('href', d => d.entity.avatar)
    .attr('clip-path', 'url(#avatarClip)')

  // Entity's Link
  let nodeLink = nodeEnter
    .append('a')
    .attr('class', ENTITY_LINK_CLASS)
    .attr('display', d => (d.entity.link ? '' : 'none'))
    .attr('xlink:href', d => d.entity.link)
    .on('click', helpers.customOnClick(onEntityLinkClick, onClick, config))

  iconLink({
    svg: nodeLink,
    x: nodeWidth - 20,
    y: 8,
  })

  // Add's Link
  let addLink = nodeEnter
    .append('a')
    .attr('class', ENTITY_BTN_CLASS)
    .style('display', 'none')
    .on('click', helpers.actionClick(onCreate))

  addBtn({
    svg: addLink,
    x: 2,
    y: 8,
  })

  // Edit Link
  let editLink = nodeEnter
    .append('a')
    .attr('class', ENTITY_BTN_CLASS)
    .style('display', 'none')
    .on('click', helpers.actionClick(onEdit))

  editBtn({
    svg: editLink,
    x: 2,
    y: 32,
  })

  // Delete Link
  let delLink = nodeEnter
    .append('a')
    .attr('class', ENTITY_BTN_CLASS)
    .style('display', 'none')
    .on('click', helpers.actionClick(onDelete))

  delBtn({
    svg: delLink,
    x: 2,
    y: 56,
  })

  // add org icon
  let orgChart = nodeEnter
    .append('a')
    .attr('class', 'ENTITY_ORG_CHART')
    .attr('display', d => (d.entity.totalReports > 0 ? '' : 'none'))
    .on('click', helpers.actionClick(onCreate))

  orgChartIcon ({
    svg: orgChart,
    x: nodeWidth / 2 - 12,
    y: nodeHeight - 30,
  })

  // add checkbox
  checkBox({
    svg: nodeEnter,
    size: 14,
    x: 5,
    y: nodeHeight - 20,
    rx: 2,
    ry: 2,
  })

  // Transition nodes to their new position.
  let nodeUpdate = node
    .transition()
    .duration(animationDuration)
    .attr('transform', d => `translate(${d.x},${d.y})`)

  nodeUpdate
    .select('rect.box')
    .attr('fill', backgroundColor)
    .attr('stroke', borderColor)

  // Transition exiting nodes to the parent's new position.
  let nodeExit = node
    .exit()
    .transition()
    .duration(animationDuration)
    .attr('transform', d => `translate(${parentNode.x},${parentNode.y})`)
    .remove()

  // Update the links
  let link = svg.selectAll('path.link').data(links, d => d.target.id)

  _.each(
    [
      { cls: ENTITY_NAME_CLASS, max: maxNameWordLength },
      { cls: ENTITY_TITLE_CLASS, max: maxTitleWordLength },
      { cls: ENTITY_SUB_TITLE_CLASS, max: maxSubTitleWordLength },
      { cls: COUNTS_CLASS, max: maxCountWordLength }
    ],
    ({ cls, max }) => {
      svg.selectAll(`text.unedited.${cls}`).call(
        wrapText,
        nodeWidth - 12, // Adjust with some padding
        cls === ENTITY_NAME_CLASS
          ? 3 // name should wrap at 3 lines max
          : 1, // all others have 1 line to work with
        max
      )
    })

  // Add Tooltips
  svg.selectAll(`text.${ENTITY_NAME_CLASS}`).append('svg:title').text(d => getName ? getName(d) : helpers.getName(d))
  svg.selectAll(`text.${ENTITY_TITLE_CLASS}`).append('svg:title').text(d => getTitle ? getTitle(d) : helpers.getTitle(d))
  svg.selectAll(`text.${ENTITY_SUB_TITLE_CLASS}`).append('svg:title').text(d => getSubTitle ? getSubTitle(d) : helpers.getSubTitle(d))

  // Render lines connecting nodes
  renderLines(config)

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x
    d.y0 = d.y
  })

  var nodeLeftX = -70
  var nodeRightX = 70
  var nodeY = 200
  nodes.map(d => {
    nodeLeftX = d.x < nodeLeftX ? d.x : nodeLeftX
    nodeRightX = d.x > nodeRightX ? d.x : nodeRightX
    nodeY = d.y > nodeY ? d.y : nodeY
  })

  config.nodeRightX = nodeRightX
  config.nodeY = nodeY
  config.nodeLeftX = nodeLeftX * -1

  d3.select(downloadImageId).on('click', function() {
    exportOrgChartImage(config)
  })

  d3.select(downloadPdfId).on('click', function() {
    exportOrgChartPdf(config)
  })
  onConfigChange(config)
}
module.exports = render
