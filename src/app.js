import * as d3 from 'd3';

const canvas = d3.select('#globe');
const context = canvas.node().getContext('2d');

const water = {type: 'Sphere'}
const projection = d3.geoOrthographic().precision(0.1)
const graticule = d3.geoGraticule10()
const path = d3.geoPath(projection).context(context)