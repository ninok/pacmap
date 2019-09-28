/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates, webMercatorTilingScheme } from "@here/harp-geoutils";
import { View } from "./View";
import { SphereBufferGeometry, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { MapAnchor } from "@here/harp-mapview";
import { OmvProtobufDataAdapter } from "@here/harp-omv-datasource/lib/OmvData";
import { RoadExtractor } from "./road_extractor";

const canvas = document.getElementById("map") as HTMLCanvasElement

const app = new View({
    canvas
});

const mapView = app.mapView;

// make map full-screen
mapView.resize(window.innerWidth, window.innerHeight);

// react on resize events from the browser.
window.addEventListener("resize", () => {
    mapView.resize(window.innerWidth, window.innerHeight);
});

// center the camera to New York
mapView.lookAt(new GeoCoordinates(40.70398928, -74.01), 500, 0, 0);

const pacman: MapAnchor<Mesh> = new Mesh(new SphereBufferGeometry(10.0, 20, 20), new MeshStandardMaterial({ color: "#ffff00" }));
pacman.geoPosition = new GeoCoordinates(40.70398928, -74.01);
pacman.renderOrder = 100000;

mapView.mapAnchors.add(pacman);

// make sure the map is rendered
mapView.update();

const tileKey = webMercatorTilingScheme.getTileKey(pacman.geoPosition, 16);
console.log("Pacman @", tileKey);
const geoBox = webMercatorTilingScheme.getGeoBox(tileKey);

const roads = new Array<Array<Vector3>>();
let i = { road: 0, vertex: 0 };

document.onkeydown = (ev: KeyboardEvent) => {
    if (roads.length === 0) {
        // roads are not loaded yet
        return;
    }
    // Take the next vertex in the buffer order
    switch (ev.key) {
        case "ArrowUp":
            i.vertex++;
            break;
        case "ArrowDown":
            i.vertex--;
            break;
    }

    // Manage wrap arounds
    if (i.vertex < 0) {
        i.road--;
        if (i.road < 0) {
            i.road = 0;
            i.vertex = 0;
        } else {
            i.vertex = roads[i.road].length - 1;
        }
    } else if (i.vertex >= roads[i.road].length) {
        i.road++
        if (i.road >= roads.length) {
            i.road = roads.length - 1;
            i.vertex = roads[i.road].length - 1;
        } else {
            i.vertex = 0;
        }
    }

    pacman.geoPosition = mapView.projection.unprojectPoint(roads[i.road][i.vertex]);

    mapView.update();
}

const vectorDataSource = app.omvDataSource;
//vectorDataSource.connect().then(() => {
mapView.addDataSource(vectorDataSource).then(() => {
    vectorDataSource
        .dataProvider()
        .getTile(tileKey)
        .then(payload => {
            const processor = new RoadExtractor(roads, mapView, tileKey, geoBox);
            const adaptor = new OmvProtobufDataAdapter(processor, processor.dataFilter);
            adaptor.process(payload as ArrayBuffer, tileKey);
            pacman.geoPosition = mapView.projection.unprojectPoint(roads[i.road][i.vertex]);
            mapView.lookAt(pacman.geoPosition, 500, 0, 0);
            mapView.update();
        });
});

mapView.update();
