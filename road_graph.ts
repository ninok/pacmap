import { Vector3 } from "three";

// Indices: 
// top = 0
// bottom = 1
// left = 2
// right = 3
// unknown > 3

export class Node {
    constructor(readonly position: Vector3,
        readonly neighbors: Array<Node | undefined> = [undefined, undefined, undefined, undefined]) {
    }

    get top(): Node | undefined {
        return this.neighbors[0];
    }
    get bottom(): Node | undefined {
        return this.neighbors[1];
    }
    get left(): Node | undefined {
        return this.neighbors[2];
    }
    get right(): Node | undefined {
        return this.neighbors[3];
    }
};

export class RoadGraph {
    private nodes = new Map<string, Node>();

    public getNode(position: Vector3) {
        const key = JSON.stringify(position);

        let node = this.nodes.get(key);
        if (node === undefined) {
            node = new Node(position);
            this.nodes.set(key, node);
        }
        return node;
    }

    private getNeighborIndex(a: Node, b: Node): number {
        const x = b.position.x - a.position.x;
        const y = b.position.y - a.position.y;
        const angle = Math.atan2(y, x) + Math.PI;
        if (angle > 0 && angle <= Math.PI / 4) {
            //left
            return 2;
        }
        else if (angle > Math.PI / 4 && angle <= (3 * Math.PI / 4)) {
            //bottom
            return 1;
        }
        else if (angle > (3 * Math.PI / 4) && angle <= (5 * Math.PI / 4)) {
            //right
            return 3;
        }
        else if (angle > (5 * Math.PI / 4) && angle <= (7 * Math.PI / 4)) {
            //top
            return 0;
        }
        else if (angle > (5 * Math.PI / 4) && angle <= (2 * Math.PI)) {
            //left
            return 2;
        }
        else {
            throw Error(`angle ${angle} not in ]0, 2PI] range`);
        }
    }

    private reverseIndex(index: number): number {
        // top = 0
        // bottom = 1
        // left = 2
        // right = 3

        switch (index) {
            case 0: return 1;
            case 1: return 0;
            case 2: return 3;
            case 3: return 2;
        }
        throw new Error(`Unknown neighbor index ${index}`);
    }

    constructor(roads: Array<Array<Vector3>>) {
        roads.forEach((road: Array<Vector3>) => {
            for (let i = 0; i < road.length; ++i) {
                const node = this.getNode(road[i]);

                // TODO: Instead of choosing at insert time which neighbor is top/bottom/left/right,
                // all neighbors should be collected and the one that is the "toppest" or "leftest"
                // should be chosen.
                if (i > 0) {
                    const prevNode = this.getNode(road[i - 1]);
                    const index = this.getNeighborIndex(node, prevNode);
                    const revIndex = this.reverseIndex(index);

                    node.neighbors[index] = prevNode;
                    prevNode.neighbors[revIndex] = node;
                }

                if (i < (road.length - 1)) {
                    const nextNode = this.getNode(road[i + 1]);
                    const index = this.getNeighborIndex(node, nextNode);
                    const revIndex = this.reverseIndex(index);

                    node.neighbors[index] = nextNode;
                    nextNode.neighbors[revIndex] = node;
                }
            }
        });
    }
}