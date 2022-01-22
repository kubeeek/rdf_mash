import * as d3 from 'd3';
import versor from 'versor';
import * as topojson from "topojson-client";

let width = 400;
let height = 400;

let radius = 200;


// just let's make it global instead of oop ok 
let canvas;
let ctx;
let path;
let currentTextbox;

let countries;
let land;
let water;
let cList;

let rotation;
let lastTime = 0;

let degPerMs = 6/1000;
let selectedCounty = false;
let currentCountryCode = '';

let infocard = d3.select(".info-card");
infocard.node().style.visibility   = 'hidden';

let requestInProgress = false;

const infoCardDOM = {
  artist: d3.select("#name"),
  origin: d3.select("#origin"),
  genre: d3.select("#genre"),
  top: d3.select("#top"),
  img: d3.select("#pic"),

}
window.addEventListener('DOMContentLoaded', async (ev) => {
    console.info("loaded")

    const [world, countryList] = await getWorldData();

    canvas = d3.select("#globe");
    ctx = canvas.node().getContext("2d");
    currentTextbox = d3.select("#current")

 

    projection = d3.geoOrthographic().scale(radius).translate([width/2, height/2]);
    path = d3.geoPath(projection, ctx);
    cList = countryList;

    countries = topojson.feature(world, world.objects.countries);
    land = topojson.feature(world, world.objects.land);
    water = {type: 'Sphere'}

    d3.timer(rotate)

    canvas
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
      )
      .on('click', mousemove);
    window.addEventListener('resize', scale);
    scale()

})

function dragstarted() {
  v0 = versor.cartesian(projection.invert(d3.mouse(this)))
  r0 = projection.rotate()
  q0 = versor(r0)
}

function dragged() {
  var v1 = versor.cartesian(projection.rotate(r0).invert(d3.mouse(this)))
  var q1 = versor.multiply(q0, versor.delta(v0, v1))
  var r1 = versor.rotation(q1)
  projection.rotate(r1)
  render()
}

function scale() {
  width = document.documentElement.clientWidth - document.documentElement.clientWidth*1/5
  height = document.documentElement.clientHeight - document.documentElement.clientHeight*1/2
  canvas.attr('width', width).attr('height', height)
  projection
    .scale((1 * Math.min(width, height)) / 2)
    .translate([width / 2, height / 2])
};

function mousemove() {
    const c = getCountry(this);
    
    selectedCounty = c;

    if (selectedCounty) {
        const countryData = cList.find(_c => _c.id == selectedCounty.id);
        if(!countryData)
          return;
        currentCountryCode = countryData["alpha-2"];
        currentTextbox.text(countryData.name);
        console.log(currentCountryCode);
    } else {
        currentTextbox.text("Choose a country")
    }
    showBox();

}

function getCountry(event) {
    var pos = projection.invert(d3.mouse(event))
    console.log(pos)
    return countries.features.find(function(f) {
      return f.geometry.coordinates.find(function(c1) {
        return d3.polygonContains(c1, pos) || c1.find(function(c2) {
          return d3.polygonContains(c2, pos)
        })
      })
    })
}

  
async function getWorldData() {
    let world = await (await fetch("https://raw.githubusercontent.com/vega/datalib/master/test/data/world-110m.json")).json();
    let countryList = await d3.csv('https://gist.githubusercontent.com/lkopacz/dfd9cc04a4d5a5f0fe87c89a79524479/raw/39100d4f6b7c784bd5d838a4e357873ef6877579/world-country-names.csv')
    return [world, countryList]
}

function fill(object, color) {
    ctx.beginPath();
    path(object);
    ctx.fillStyle = color;
    ctx.fill();
}

function stroke(object, color) {
    ctx.beginPath()
    path(object)
    ctx.strokeStyle = color
    ctx.fill();
    ctx.stroke()
}


function render() {
    ctx.clearRect(0, 0, width, height)
    fill(water, "aquamarine");
    fill(land, "green");
    stroke(countries, "black");

    if(selectedCounty != false)  {
        fill(selectedCounty, "red")
    }
  }

function rotate(elapsed) {
        let now = d3.now()
        let diff = now - lastTime
        if (diff < elapsed) {
          rotation = projection.rotate()
          rotation[0] += diff * degPerMs
          projection.rotate(rotation)
          render()
        }
        lastTime = now
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function showBox() {
  if(requestInProgress)
    return;

  infocard.node().style.visibility   = 'visible';

  requestInProgress = true;

  const type = getRandomIntInclusive(0, 1) == 0 ? 'artist' : 'band';
  let result = null;
  try {
  result  = await (await fetch(`http://localhost:5000/${type}/${currentCountryCode}`)).json();
    console.log(result);
  } catch (e) {
    console.error(e);
    return;
  }

  infoCardDOM.artist.text(result.name)
  infoCardDOM.origin.text(result.country.slice(0, 2).join(', '))
  infoCardDOM.genre.text(result.genre.map(_v => _v[0].toUpperCase() + _v.slice(1)).slice(0, 2).join(', '))
  infoCardDOM.img.attr("src", result.image.url)

  requestInProgress = false;
  d3.select("#data").node().style.display = 'flex';
  d3.select("#loading").node().style.display = 'none';
  d3.select("#loading").node().style.position = 'absolute';
  d3.select("#audio-src").node().src = result.audio.preview;

};

getWorldData();
