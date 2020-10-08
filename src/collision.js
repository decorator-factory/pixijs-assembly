export const isPointInRectangle = (x, y, x1, y1, x2, y2) =>
    (x1 <= x && x <= x2) && (y1 <= y && y <= y2);


export const isCircleInRectangle = (x, y, r, x1, y1, x2, y2) => {
    //@ If no collision is found, return `null`.
    //@ Otherwise, return a vector [cx, cy] pointing outwards of the rectangle.

    // http://www.jeffreythompson.org/collision-detection/circle-rect.php

    const [cx, edgeX] = (x <= x1) ? [-1, x1] : (x >= x2) ? [1, x2] : [0, x];
    const [cy, edgeY] = (y <= y1) ? [-1, y1] : (y >= y2) ? [1, y2] : [0, y];

    const dist = Math.hypot(x - edgeX, y - edgeY);

    if (dist < r)
        return [cx, cy];
    else
        return null;
};


export const isRectangleInRectangle = (rect1, rect2) => {
    const [x1, y1, x2, y2] = rect1;
    const [x3, y3, x4, y4] = rect2;
    return !(x2 < x3 || x4 < x1 || y2 < y3 || y4 < y1);
};