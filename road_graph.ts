import { Vector3 } from "three";

export class Node {
    constructor(readonly position: Vector3, readonly neighbors: Array<Node>) {

    }
};

export class RoadGraph {
    private nodes = new Map<string, Node>();
    constructor(roads: Array<Array<Vector3>>) {

    }
}