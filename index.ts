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
import { RoadGraph, Node } from "./road_graph";

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

let node: Node | undefined;

document.onkeydown = (ev: KeyboardEvent) => {
    if (roads.length === 0 || node === undefined) {
        // roads are not loaded yet
        return;
    }

    switch (ev.key) {
        case "ArrowUp":
            if (node.top !== undefined) {
                node = node.top;
            }
            break;
        case "ArrowDown":
            if (node.bottom !== undefined) {
                node = node.bottom;
            }
            break;
        case "ArrowLeft":
            if (node.left !== undefined) {
                node = node.left;
            }
            break;
        case "ArrowRight":
            if (node.right !== undefined) {
                node = node.right;
            }
            break;
    }

    pacman.geoPosition = mapView.projection.unprojectPoint(node.position);

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

            const roadGraph = new RoadGraph(processor.roads);
            node = roadGraph.getNode(roads[0][0]);

            pacman.geoPosition = mapView.projection.unprojectPoint(node.position);
            mapView.lookAt(pacman.geoPosition, 500, 0, 0);
            mapView.update();
        });
});

mapView.update();
