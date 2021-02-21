/* global fetch, setTimeout, clearTimeout */
import React, { useEffect, useState, useRef } from 'react';
import { render } from 'react-dom';

import { StaticMap } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { PathLayer, IconLayer } from '@deck.gl/layers';
import { GLTFLoader } from '@loaders.gl/gltf';
import { registerLoaders } from '@loaders.gl/core';
import lineDataMock from './data/112.json';
import turf from 'turf';
import axios from 'axios';

registerLoaders([GLTFLoader]);

// Set your mapbox token here
const MAPBOX_TOKEN = 'pk.eyJ1IjoianRqIiwiYSI6ImNrNGw2YnB6YzBkbWYzbnM4eDI2cGZ3c3cifQ.Q1yjc-bFHp3q6LQ6Whm8lw'; // eslint-disable-line
// mapbox style file path
const MAPBOX_STYLE =
  'https://rivulet-zhang.github.io/dataRepo/mapbox/style/map-style-dark-v9-no-labels.json';

const ICON_MAPPING = {
  marker: { x: 0, y: 0, width: 256, height: 256, mask: false }
};
const ICON_ATLAS = 'data/car.png';


const INITIAL_VIEW_STATE = {
  latitude: 32.49567022573267,
  longitude: 120.98157868572873,
  zoom: 10,
  maxZoom: 16,
  pitch: 0,
  bearing: 0
};


export default function App({ sizeScale = 10000, onDataLoad, mapStyle = MAPBOX_STYLE }) {
  const showSpeedFactor = 800;// 值越大 显示速度越快
  const [data, setData] = useState([]);
  // const [timer, setTimer] = useState({});
  const [time, setTime] = useState(-20);
  const [moveTime, setMoveTime] = useState(900);
  const [pathData, setPathData] = useState([]);
  const lastTimeRef = useRef(0);
  const indexRef = useRef(0);

  function getTooltip({ object }) {
    if (object) {
      const index = pathData[0].time.findIndex(t => t > time);
      const fromPoint = turf.point(pathData[0].path[index - 1]);
      const toPoint = turf.point(pathData[0].path[index]);
      const distance = turf.distance(fromPoint, toPoint);
      console.log(distance,moveTime);
      const speed = 3600 * distance / (moveTime/1000)/showSpeedFactor;
      console.log('speed',speed);
      return (
        object &&
        `\
        速度: ${speed.toFixed(2)}km/h`
      );

    }

  }
  function getBearing() {
    if (pathData.length > 0) {
      // const index = pathData[0].time.indexOf(Math.round(time));
      const index = pathData[0].time.findIndex(t => t > time);
      if (index !== -1) {
        // console.log('index',index);
        const startPoint = pathData[0].path[index-1];
        const endPoint = pathData[0].path[index];
        const bearing = turf.bearing(startPoint, endPoint);
        let angle;
        if (bearing >= 0) {
          angle = (360 - bearing);
        } else {
          angle = -bearing;
        }
        if (angle > 270) {
          return angle - 270;
        } else {
          return angle + 90;
        }
      }
    }
    return 0
  }

  useEffect(() => {
    const loadData = async ()=>{
      try {
        // const req = await axios.post('http://portal-just-beta.jd.com/nantonggisserver/trajectory/complete',{
        //   carNum: "苏AG7235",
        //   endTime: "2020-09-07",
        //   startTime: "2020-09-04"
        // });
        const lineData = lineDataMock;
        console.log('lineData:', lineData);
        setData([[lineData.points[0][1], lineData.points[0][2]]]);
        const pathD = [{ path: null, time: null }];
        pathD[0].path = lineData.points.map(d => [d[1], d[2]]);
        pathD[0].time = lineData.points.map((d, i) => {
          if (i === 0) {
            return 0
          } else {
            const startTime = new Date(lineData.points[0][0]).getTime();
            const endTime = new Date(lineData.points[i][0]).getTime();
            const intervalTime = endTime - startTime;
            return Math.ceil(intervalTime / showSpeedFactor)
          }
        });
        setPathData(pathD);
        
        animate();
      } catch (error) {
        
      }
    }
    loadData();
  }, []);
  useEffect(() => {
    if (pathData[0]) {
      // const index = pathData[0].time.indexOf(Math.round(time));
      const index = pathData[0].time.findIndex(t => t > time);
      if (index>0 && index!==indexRef.current) {
        indexRef.current = index;
        setMoveTime(pathData[0].time[index] - pathData[0].time[index-1]);
        setData([pathData[0].path[index]]);
      }
    }
  }, [time]);
  const animate = () => {
    // 设置补偿
    const d = new Date();
    const time = d.getTime();
    const radio = (time - lastTimeRef.current) / 16.6;
    // console.log('radio',radio);
    setTime(t => (t + 1 / radio));
    lastTimeRef.current = time;
    requestAnimationFrame(animate);
  }

  const pathLayer = pathData && new PathLayer({
    id: 'path-layer',
    data: pathData,
    // pickable: true,
    widthScale: 20,
    widthMinPixels: 2,
    getPath: d => d.path,
    getColor: d => [0, 255, 0, 255],
    getWidth: d => 5
  });

  const iconLayer = Array.isArray(data) && data.length>0 && data[0] && new IconLayer({
    id: 'icon',
    data: data,
    pickable: true,
    getPosition: d => data[0],
    getIcon: d => 'marker',
    getAngle: d => getBearing(),
    // getAngle: d => 0,

    iconAtlas: ICON_ATLAS,
    iconMapping: ICON_MAPPING,
    sizeUnits: 'meters',
    sizeScale: 1000,
    sizeMinPixels: 6,
    transitions: {
      getPosition: moveTime * 16.6,
      getAngle: 200
    },
  });

  const layers = [pathLayer, iconLayer].filter(i => i);


  return (
    <DeckGL
      layers={layers}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
    >
      <StaticMap
        reuseMaps
        mapStyle={mapStyle}
        preventStyleDiffing={true}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />
    </DeckGL>
  );
}

export function renderToDOM(container) {
  render(<App />, container);
}
