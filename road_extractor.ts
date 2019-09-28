import {
    IGeometryProcessor,
    ILineGeometry,
    IPolygonGeometry
} from "@here/harp-omv-datasource/lib/IGeometryProcessor";
import { MapEnv } from "@here/harp-datasource-protocol/lib/Expr";
import { lat2tile } from "@here/harp-omv-datasource/lib/OmvUtils";
import { TileKey, webMercatorProjection, EarthConstants, GeoBox } from "@here/harp-geoutils";
import { Vector2, Geometry, Line, Vector3, LineBasicMaterial } from "three";
import { MapViewEventNames, MapView } from "@here/harp-mapview";
import { OmvFeatureFilter, OmvGeometryType } from "@here/harp-omv-datasource";


function tile2world(
    extents: number,
    geoBox: GeoBox,
    level: number,
    flipY: boolean,
    position: Vector2,
    target: Vector3 = new Vector3()
): Vector3 {
    const { north, west } = geoBox;
    const N = Math.log2(extents);
    const scale = Math.pow(2, level + N);
    const top = lat2tile(north, level + N);
    const left = ((west + 180) / 360) * scale;
    const R = EarthConstants.EQUATORIAL_CIRCUMFERENCE;

    return target.set(
        ((left + position.x) / scale) * R,
        ((top + (flipY ? -position.y : position.y)) / scale) * R,
        0
    );
}

class RoadDataFilter implements OmvFeatureFilter {
    hasKindFilter: false;
    wantsLayer(layer: string, level: number): boolean {
        return layer === "roads";
    }
    wantsPointFeature(layer: string, geometryType: OmvGeometryType, level: number): boolean {
        return false;
    }
    wantsLineFeature(layer: string, geometryType: OmvGeometryType, level: number): boolean {
        return layer === "roads";
    }
    wantsPolygonFeature(layer: string, geometryType: OmvGeometryType, level: number): boolean {
        return false;
    }
    wantsKind(kind: string | string[]): boolean {
        return true;
    }

};
export class RoadExtractor implements IGeometryProcessor {

    readonly dataFilter = new RoadDataFilter();
    constructor(
        readonly roads: Array<Array<Vector3>>,
        private mapView: MapView,
        private tileKey: TileKey,
        private geoBox: GeoBox) {
    }
    processPointFeature(layerName: string, layerExtents: number, geometry: Vector2[], env: MapEnv, storageLevel: number): void {

    }

    processLineFeature(layerName: string, layerExtents: number, geometry: ILineGeometry[], env: MapEnv, storageLevel: number): void {
        const mapView = this.mapView;
        const projection = mapView.projection;
        const roads = this.roads

        const material = new LineBasicMaterial({ color: "#ff0000" });
        geometry.forEach((lineGeometry: ILineGeometry) => {
            const threeGeometry = new Geometry();
            lineGeometry.positions.forEach((position: Vector2) => {
                const worldPos = projection.reprojectPoint(
                    webMercatorProjection,
                    tile2world(4096, this.geoBox, this.tileKey.level, false, position),
                    new Vector3()
                );

                threeGeometry.vertices.push(worldPos);
            });
            roads.push(threeGeometry.vertices);

            const line = new Line(threeGeometry, material);
            line.renderOrder = 100000;
            line.position.copy(mapView.camera.position).multiplyScalar(-1);
            mapView.scene.add(line);

            mapView.addEventListener(MapViewEventNames.Render, () => {
                line.position.copy(mapView.camera.position).multiplyScalar(-1);
            });
        });
    }

    processPolygonFeature(layerName: string, layerExtents: number, geometry: IPolygonGeometry[], env: MapEnv, storageLevel: number): void {

    }
};
