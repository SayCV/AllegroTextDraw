/**
 * Copyright (c) 2011-2016 by Andrew Mustun. All rights reserved.
 * 
 * This file is part of the QCAD project.
 *
 * QCAD is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * QCAD is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with QCAD.
 */

include("scripts/Tools/arguments.js");
include("scripts/library.js");
include("scripts/Modify/Explode/Explode.js");

function printHelp() {
    print("Usage: " + args[1] + " [OPTIONS]... <input-file> <output-file>");
    print();
    print("Changes the color of all solid lines in the given file to blue.");
    print();
    print("  -h, -help               Display this help");
    print();
}

/**
 * Explodes all selected entities.
 * \param di Document interface
 * \param action Action object (used to assign text to transaction), optional
 */
function ExplodeSelection(di, action) {
    var document = di.getDocument();
    var storage = document.getStorage();
    var ids = document.querySelectedEntities();
    var i, k, e, n;
    var polyline, shapes, shape;

    var splineTolerance = RSettings.getDoubleValue("Explode/SplineTolerance", 0.01);
    var splineSegments = RSettings.getIntValue("Explode/SplineSegments", 64);
    var ellipseSegments = RSettings.getIntValue("Explode/EllipseSegments", 32);
    var splinesToLineSegments = RSettings.getBoolValue("Explode/SplinesToLineSegments", false);
    var textToPolylines = RSettings.getBoolValue("Explode/TextToPolylines", true);

    var op = new RAddObjectsOperation();

    if (!isNull(action)) {
        op.setText(action.getToolTitle());
    }

    for (i=0; i<ids.length; i++) {
        var id = ids[i];
        var entity = document.queryEntity(id);
        if (isNull(entity)) {
            debugger;
        }

        // these entity types are not explodable:
        if (isPointEntity(entity) ||
            isLineEntity(entity) ||
            isArcEntity(entity) ||
            isCircleEntity(entity)) {
            continue;
        }

        var newShapes = [];
        var newEntities = [];

        // explode ellipse into polyline with arc segments:
        if (isEllipseEntity(entity)) {
            if (REllipse.hasProxy()) {
                var ellipse = entity.getData().castToShape();
                polyline = ellipse.approximateWithArcs(ellipseSegments);
                if (!polyline.isEmpty()) {
                    newShapes.push(polyline);
                }
            }
            else {
                continue;
            }
        }

        // explode polyline into line and arc segments:
        else if (isPolylineEntity(entity)) {
            polyline = entity.getData().castToShape();
            if (RPolyline.hasProxy() && polyline.hasWidths()) {
                var pls = polyline.getOutline();
                for (k=0; k<pls.length; k++) {
                    newShapes.push(pls[k]);
                }
            }
            else {
                var polySegments = polyline.getExploded();
                if (polySegments.length>0) {
                    for (k=0; k<polySegments.length; k++) {
                        shape = polySegments[k].data();

                        // last shape might have zero length if polyline is closed geometrically and logically:
                        if (k===polySegments.length-1) {
                            if (shape.getLength()<1.0e-5) {
                                break;
                            }
                        }

                        newShapes.push(shape.clone());
                    }
                }
            }
        }

        // explode spline into polyline with line segments:
        else if (isSplineEntity(entity)) {
            var spline = entity.getData().castToShape();
            var pl;
            if (RSpline.hasProxy() && !splinesToLineSegments) {
                pl = spline.approximateWithArcs(splineTolerance);
            }
            else {
                pl = spline.toPolyline(splineSegments);
            }

            pl.simplify();
            newShapes.push(pl);
        }

        // explode hatch into lines / solid fill into boundary:
        else if (isHatchEntity(entity)) {
            if (entity.isSolid()) {
                for (k=0; k<entity.getLoopCount(); k++) {
                    shapes = entity.getLoopBoundary(k);
                    for (n=0; n<shapes.length; n++) {
                        shape = shapes[n];
                        newShapes.push(shape.clone());
                    }
                }
            }
            else {
                var painterPaths = entity.getPainterPaths(false);
                for (k=0; k<painterPaths.length; k++) {
                    shapes = painterPaths[k].getShapes();
                    for (n=0; n<shapes.length; n++) {
                        shape = shapes[n].data();
                        if (isSplineShape(shape)) {
                            shape = ShapeAlgorithms.splineToLineOrArc(shape, 0.01);
                        }
                        newShapes.push(shape.clone());
                    }
                }
            }
        }

        // explode dimension into lines, solids (triangles) and a text entity:
        else if (isDimensionEntity(entity)) {
            shapes = entity.getShapes();
            for (k=0; k<shapes.length; k++) {
                newShapes.push(shapes[k].data());
            }
            var textData = entity.getData().getTextData();
            e = new RTextEntity(entity.getDocument(), textData);
            e.setSelected(true);
            e.copyAttributesFrom(entity.data());
            newEntities.push(e);
        }

        // explode leaders into lines and solids (triangles):
        else if (isLeaderEntity(entity)) {
            shapes = entity.getShapes();
            for (k=0; k<shapes.length; k++) {
                shape = shapes[k].data();
                newShapes.push(shape.clone());
            }
        }

        // explode solids into polylines:
        else if (isSolidEntity(entity)) {
            shapes = entity.getShapes();
            for (k=0; k<shapes.length; k++) {
                shape = shapes[k].data();
                if (shape.countVertices()===4) {
                    var v3 = shape.getVertexAt(3);
                    shape.setVertexAt(3, shape.getVertexAt(2));
                    shape.setVertexAt(2, v3);
                }
                newShapes.push(shape.clone());
            }
        }

        // explode faces into polylines:
        else if (isFaceEntity(entity)) {
            shapes = entity.getShapes();
            for (k=0; k<shapes.length; k++) {
                shape = shapes[k].data();
                newShapes.push(shape.clone());
            }
        }

        // explode text entities into lines, arcs and splines:
        else if (isTextEntity(entity)) {
            var painterPaths = entity.getPainterPaths();
            for (k=0; k<painterPaths.length; k++) {
                var p = painterPaths[k].getPen();
                var b = painterPaths[k].getBrush();
                var col = undefined;

                if (p.style()!==Qt.NoPen) {
                    if (p.color().isValid()) {
                        col = p.color().name();
                    }
                }
                else if (b.style()!==Qt.NoBrush) {
                    if (b.color().isValid()) {
                        col = b.color().name();
                    }
                }

                // ignore text bounding box, used only to display instead of
                // text at small zoom factors:
                if (painterPaths[k].getFeatureSize()<0) {
                    continue;
                }

                var plText = undefined;

                shapes = painterPaths[k].getShapes();
                for (n=0; n<shapes.length; n++) {
                    shape = shapes[n];
                    if (isSplineShape(shape)) {
                        // spline to arc or line or spline:
                        shape = ShapeAlgorithms.splineToLineOrArc(shape, splineTolerance);

                        if (textToPolylines) {
                            // spline to polyline with arcs:
                            if (isSplineShape(shape)) {
                                if (RSpline.hasProxy() && !splinesToLineSegments) {
                                    shape = shape.approximateWithArcs(splineTolerance);
                                }
                                else {
                                    shape = shape.toPolyline(splineSegments);
                                }
                            }
                        }
                    }

                    if (!isNull(shape)) {
                        var sc = shape.clone();
                        sc.color = col;

                        if (textToPolylines) {
                            // explode to polylines:
                            if (!isNull(plText) && plText.getEndPoint().equalsFuzzy(shape.getStartPoint())) {
                                plText.appendShape(sc);
                            }
                            else {
                                if (!isNull(plText)) {
                                    plText.toLogicallyClosed();
                                }

                                plText = new RPolyline();
                                newShapes.push(plText);
                                plText.appendShape(sc);
                            }
                        }
                        else {
                            // explode to lines, arcs, polylines:
                            newShapes.push(sc);
                        }
                    }
                }

                if (textToPolylines) {
                    if (!isNull(plText)) {
                        plText.toLogicallyClosed();
                    }
                }
            }
        }

        // explode attribute entities into texts:
        else if (isAttributeEntity(entity)) {
            // create text data from attribute data:
            var d = new RTextData(entity.getData());
            // unlink from parent (block ref):
            d.setParentId(RObject.INVALID_ID);
            newEntities.push(new RTextEntity(document, d));
        }

        // explode block reference or block reference array:
        else if (isBlockReferenceEntity(entity)) {
            var data = entity.getData();
            var pos = entity.getPosition();

            // explode array into multiple block references:
            if (data.getColumnCount()>1 || data.getRowCount()>1) {
                for (var col=0; col<data.getColumnCount(); col++) {
                    for (var row=0; row<data.getRowCount(); row++) {
                        var offset = data.getColumnRowOffset(col, row);

                        e = entity.clone();
                        e.setRowCount(1);
                        e.setColumnCount(1);
                        e.setPosition(pos.operator_add(offset));
                        storage.setObjectId(e, RObject.INVALID_ID);
                        e.setSelected(true);
                        newEntities.push(e);
                    }
                }
            }

            // explode block reference into contained entities:
            else {
                var subIds = document.queryBlockEntities(data.getReferencedBlockId());
                for (k=0; k<subIds.length; k++) {
                    var subEntity = data.queryEntity(subIds[k]);
                    if (isNull(subEntity)) {
                        continue;
                    }

                    // ignore attribute definitions:
                    if (isAttributeDefinitionEntity(subEntity)) {
                        continue;
                    }

                    e = subEntity.clone();
                    //data.applyColumnRowOffsetTo(e, col, row);
                    storage.setObjectId(e, RObject.INVALID_ID);
                    e.setBlockId(document.getCurrentBlockId());
                    e.setSelected(true);
                    newEntities.push(e);
                }
            }
        }

        // add explosion result and delete original:
        if (newShapes.length!==0 || newEntities.length!==0) {
            // add entities based on shapes that resulted from the explosion:
            for (k=0; k<newShapes.length; k++) {
                shape = newShapes[k];
                e = shapeToEntity(entity.getDocument(), shape);
                if (!isNull(e)) {
                    e.setSelected(true);
                    e.copyAttributesFrom(entity.data());
                    if (!isNull(shape.color)) {
                        e.setColor(new RColor(shape.color));
                    }
                    op.addObject(e, false);
                }
            }

            // add entities based on entities that resulted from the explosion:
            for (k=0; k<newEntities.length; k++) {
                op.addObject(newEntities[k], false);
            }

            // delete original entity:
            op.deleteObject(entity);
        }
        else {
            // delete original entity:
            op.deleteObject(entity);
        }
    }

    di.applyOperation(op);
};

/**
 * \ingroup ecma_misc_examples_commandlineexamples
 * Command line tool.
 * Changes the color of all solid lines in the given file to blue.
 * Execute with ./qcad -autostart scripts/Misc/Examples/CommandLineExamples/ExSetColor/ExSetColor.js
 */
function main() {
    qApp.applicationName = "ATD DXF Exploding";
    if (args.length < 3) {
        print("No input file given. Try -h for help.");
        return;
    }

    var opts = [ 
                 [ "help", false, "h" ]
               ];

    if (testArgument(args, "-h", "-help")) {
        printHelp();
        return;
    }
    
    var inputFile = args[args.length - 2];
    if (inputFile.indexOf("-") === 0) {
        print("No input file. Try -h for help.");
        return;
    }

    if (!new QFileInfo(inputFile).isAbsolute()) {
        inputFile = RSettings.getLaunchPath() + QDir.separator + inputFile;
    }

    var outputFile = args[args.length - 1];
    if (outputFile.indexOf("-") === 0) {
        print("No output file. Try -h for help.");
        return;
    }

    if (!new QFileInfo(outputFile).isAbsolute()) {
        outputFile = RSettings.getLaunchPath() + QDir.separator + outputFile;
    }

    //debugger;
    var storage = new RMemoryStorage();
    var spatialIndex = new RSpatialIndexNavel();
    var doc = new RDocument(storage, spatialIndex);
    var di = new RDocumentInterface(doc);
    doc.setUnit(RS.Millimeter);

    if (di.importFile(inputFile) != RDocumentInterface.IoErrorNoError) {
        qWarning("Cannot import file:", inputFile);
        return;
    }

    print("Exploding");
    print("  from: " + inputFile);
    print("  to  : " + outputFile);

    //debugger;
    di.selectAll();
    var action = undefined;
    //ExplodeSelection(di, action);
    //var exp = new Explode();
    Explode.explodeSelection(di, action);

    di.exportFile(outputFile, "R15 (2000/LT2000) DXF"); // "R24 (2010) DXF" 
}

if (typeof(including)=='undefined' || including===false) {
    main();
}
