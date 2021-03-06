/*
 *     Copyright (c) 2014-2015 CoNWeT Lab., Universidad Politécnica de Madrid
 *     Copyright (c) 2019-2020 Future Internet Consulting and Development Solutions S.L.
 *
 *     This file is part of Wirecloud Platform.
 *
 *     Wirecloud Platform is free software: you can redistribute it and/or
 *     modify it under the terms of the GNU Affero General Public License as
 *     published by the Free Software Foundation, either version 3 of the
 *     License, or (at your option) any later version.
 *
 *     Wirecloud is distributed in the hope that it will be useful, but WITHOUT
 *     ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 *     FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public
 *     License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with Wirecloud Platform.  If not, see
 *     <http://www.gnu.org/licenses/>.
 *
 */

/* globals Wirecloud */


(function (utils) {

    "use strict";

    /**
     * Represents a dragboard layout to be used to place iwidgets into the dragboard.
     *
     * @param dragboard        associated dragboard
     * @param columns          number of columns of the layout
     * @param rows             number of rows of the layout
     * @param verticalMargin   vertical margin between iwidgets in pixels
     * @param horizontalMargin horizontal margin between iwidgets in pixels
     */
    var GridLayout = function GridLayout(dragboard, columns, rows, verticalMargin, horizontalMargin) {
        this.initialized = false;
        Object.defineProperties(this, {
            'columns': {value: columns},
            'rows': {value: rows}
        });
        this._buffers = {base: {}};
        clearMatrix.call(this);         // Matrix of iWidgets

        if ((verticalMargin % 2) === 0) {
            this.topMargin = verticalMargin / 2;
            this.bottomMargin = verticalMargin / 2;
        } else {
            this.topMargin = Math.floor(verticalMargin / 2);
            this.bottomMargin = Math.floor(verticalMargin / 2) + 1;
        }

        if ((horizontalMargin % 2) === 0) {
            this.leftMargin = horizontalMargin / 2;
            this.rightMargin = horizontalMargin / 2;
        } else {
            this.leftMargin = Math.floor(horizontalMargin / 2);
            this.rightMargin = Math.floor(horizontalMargin / 2) + 1;
        }

        this.dragboardCursor = null;
        this.iwidgetToMove = null;

        Wirecloud.ui.DragboardLayout.call(this, dragboard);
    };
    utils.inherit(GridLayout, Wirecloud.ui.DragboardLayout);

    GridLayout.prototype.fromPixelsToVCells = function fromPixelsToVCells(pixels) {
        if (pixels <= 0) {
            return 0;
        }

        let cells = pixels / this.fromVCellsToPixels(1);
        return Math.round(cells);
    };

    GridLayout.prototype.fromVCellsToPixels = function fromVCellsToPixels(rows) {
        return (this.getHeight() * this.fromVCellsToPercentage(rows)) / 100;
    };

    GridLayout.prototype.fromVCellsToPercentage = function fromVCellsToPercentage(rows) {
        return rows * (100 / this.rows);
    };

    GridLayout.prototype.getWidthInPixels = function getWidthInPixels(cells) {
        return this.fromHCellsToPixels(cells) - this.leftMargin - this.rightMargin;
    };

    GridLayout.prototype.getHeightInPixels = function getHeightInPixels(cells) {
        return this.fromVCellsToPixels(cells) - this.topMargin - this.bottomMargin;
    };

    GridLayout.prototype.fromPixelsToHCells = function fromPixelsToHCells(pixels) {
        if (pixels <= 0) {
            return 0;
        }

        let cells = pixels / this.fromHCellsToPixels(1);
        return Math.round(cells);
    };

    GridLayout.prototype.fromHCellsToPixels = function fromHCellsToPixels(columns) {
        return (this.getWidth() * this.fromHCellsToPercentage(columns)) / 100;
    };

    GridLayout.prototype.fromHCellsToPercentage = function fromHCellsToPercentage(columns) {
        return columns * (100 / this.columns);
    };

    GridLayout.prototype.adaptColumnOffset = function adaptColumnOffset(size) {
        var offsetInLU, pixels, parsedSize;

        parsedSize = this.parseSize(size);
        if (parsedSize[1] === 'cells') {
            offsetInLU = Math.round(parsedSize[0]);
        } else {
            if (parsedSize[1] === '%') {
                pixels = Math.round((parsedSize[0] * this.getWidth()) / 100);
            } else {
                pixels = parsedSize[0];
            }
            offsetInLU = Math.round(this.fromPixelsToHCells(pixels - this.leftMargin));
        }
        return new Wirecloud.ui.MultiValuedSize(this.getColumnOffset(offsetInLU), offsetInLU);
    };

    GridLayout.prototype.adaptRowOffset = function adaptRowOffset(size) {
        var offsetInLU, pixels, parsedSize;

        parsedSize = this.parseSize(size);
        if (parsedSize[1] === 'cells') {
            offsetInLU = Math.round(parsedSize[0]);
        } else {
            if (parsedSize[1] === '%') {
                pixels = Math.round((parsedSize[0] * this.getHeight()) / 100);
            } else {
                pixels = parsedSize[0];
            }
            offsetInLU = Math.round(this.fromPixelsToVCells(pixels - this.topMargin));
        }
        return new Wirecloud.ui.MultiValuedSize(this.getRowOffset({y: offsetInLU}), offsetInLU);
    };

    GridLayout.prototype.padWidth = function padWidth(width) {
        return width + this.leftMargin + this.rightMargin;
    };

    GridLayout.prototype.padHeight = function padHeight(height) {
        return height + this.topMargin + this.bottomMargin;
    };

    GridLayout.prototype.getColumnOffset = function getColumnOffset(position) {
        var tmp = Math.floor((this.getWidth() * this.fromHCellsToPercentage(position.x)) / 100);
        tmp += this.leftMargin + this.dragboard.leftMargin;
        return tmp;
    };

    GridLayout.prototype.getRowOffset = function getRowOffset(position) {
        return this.dragboard.topMargin + this.fromVCellsToPixels(position.y) + this.topMargin;
    };

    GridLayout.prototype._getPositionOn = Wirecloud.ui.ColumnLayout.prototype._getPositionOn;
    GridLayout.prototype._setPositionOn = Wirecloud.ui.ColumnLayout.prototype._setPositionOn;

    var clearMatrix = function clearMatrix() {
        this.matrix = [];
        this._buffers.base.matrix = this.matrix;

        for (var x = 0; x < this.columns; x++) {
            this.matrix[x] = [];
        }
    };

    GridLayout.prototype._hasSpaceFor = function _hasSpaceFor(_matrix, positionX, positionY, width, height) {
        var x, y;

        for (x = 0; x < width; x++) {
            for (y = 0; y < height; y++) {
                if (_matrix[positionX + x][positionY + y] != null) {
                    return false;
                }
            }
        }

        return true;
    };

    GridLayout.prototype._reserveSpace = function _reserveSpace(buffer, widget) {
        let position = this._getPositionOn(buffer, widget);
        let width = widget.shape.width;
        let height = widget.shape.height;

        this._reserveSpace2(buffer.matrix, widget, position.x, position.y, width, height);
    };

    GridLayout.prototype._clearSpace = Wirecloud.ui.ColumnLayout.prototype._clearSpace;
    GridLayout.prototype._compressColumns = Wirecloud.ui.ColumnLayout.prototype._compressColumns;
    GridLayout.prototype.moveSpaceDown = Wirecloud.ui.ColumnLayout.prototype.moveSpaceDown;
    GridLayout.prototype.moveSpaceUp = Wirecloud.ui.ColumnLayout.prototype.moveSpaceUp;
    GridLayout.prototype._removeFromMatrix = Wirecloud.ui.ColumnLayout.prototype._removeFromMatrix;
    GridLayout.prototype._reserveSpace2 = Wirecloud.ui.ColumnLayout.prototype._reserveSpace2;
    GridLayout.prototype._clearSpace2 = Wirecloud.ui.ColumnLayout.prototype._clearSpace2;

    GridLayout.prototype._notifyResizeEvent = function (widget, oldWidth, oldHeight, newWidth, newHeight, resizeLeftSide, resizeTopSide, persist) {
        var x, y;
        var step2Width = oldWidth; // default value, used when the igdaget's width doesn't change
        var position = widget.position;
        var step2X, iWidgetToMove, finalYPos, widthDiff;
        step2X = position.x;

        // First Step
        if (newWidth > oldWidth) {
            // Calculate the width for the next step
            step2Width = oldWidth;

            finalYPos = position.y + newHeight;

            if (resizeLeftSide) {
                // Move affected iwidgets
                widthDiff = newWidth - oldWidth;
                for (x = position.x - widthDiff; x < position.x; ++x) {
                    for (y = 0; y < newHeight; ++y) {
                        iWidgetToMove = this.matrix[x][position.y + y];
                        if (iWidgetToMove != null) {
                            this.moveSpaceDown(this._buffers.base, iWidgetToMove, finalYPos - iWidgetToMove.position.y);
                            break; // Continue with the next column
                        }
                    }
                }

                // Move the widget
                position.x -= widthDiff;
                widget.setPosition(position);

                // Reserve the new space
                this._reserveSpace2(this.matrix,
                    widget,
                    position.x, position.y,
                    widthDiff, newHeight
                );
            } else {
                // Move affected iwidgets
                for (x = position.x + oldWidth; x < position.x + newWidth; ++x) {
                    for (y = 0; y < newHeight; ++y) {
                        iWidgetToMove = this.matrix[x][position.y + y];
                        if (iWidgetToMove != null) {
                            this.moveSpaceDown(this._buffers.base, iWidgetToMove, finalYPos - iWidgetToMove.position.y);
                            break; // Continue with the next column
                        }
                    }
                }

                // Reserve this space
                this._reserveSpace2(
                    this.matrix, widget,
                    position.x + oldWidth, position.y,
                    newWidth - oldWidth, newHeight
                );
            }

        } else if (newWidth < oldWidth) {
            // Calculate the width for the next step
            step2Width = newWidth;

            widthDiff = oldWidth - newWidth;
            if (resizeLeftSide) {

                // Clear space
                this._clearSpace2(this.matrix, position.x, position.y, widthDiff, oldHeight);

                // Move the widget
                position.x += widthDiff;
                widget.setPosition(position);

                step2X = position.x;
            } else {
                // Clear space
                this._clearSpace2(this.matrix, position.x + newWidth, position.y, widthDiff, oldHeight);
            }
        }


        // Second Step
        if (newHeight > oldHeight) {
            var limitY = position.y + newHeight;
            var limitX = step2X + step2Width;
            for (y = position.y + oldHeight; y < limitY; y++) {
                for (x = step2X; x < limitX; x++) {
                    if (this.matrix[x][y] != null) {
                        this.moveSpaceDown(this._buffers.base, this.matrix[x][y], limitY - y);
                    }
                }
            }

            // Reserve Space
            this._reserveSpace2(this.matrix, widget, step2X, position.y + oldHeight, step2Width, newHeight - oldHeight);
        } else if (newHeight < oldHeight) {
            // Clear freed space
            this._clearSpace2(this.matrix, step2X, position.y + newHeight, step2Width, oldHeight - newHeight);
        }

        this._notifyWindowResizeEvent(true, true); // TODO
        if (persist) {
            this.dragboard.update(); // FIXME
        }
    };

    GridLayout.prototype._insertAt = function _insertAt(widget, x, y, buffer) {
        let newPosition = new Wirecloud.DragboardPosition(x > 0 ? x : 0, y > 0 ? y : 0);

        // Move other instances
        let affectedwidgets = new Set();
        let lastX = newPosition.x + widget.shape.width;
        let lastY = newPosition.y + widget.shape.height;
        let matrix = buffer.matrix;

        for (x = newPosition.x; x < lastX; x++) {
            for (y = newPosition.y; y < lastY; y++) {
                let affectedwidget = matrix[x][y];
                if (affectedwidget != null) {
                    // only move the widget if we didn't move it before
                    let affectedY = this._getPositionOn(buffer, affectedwidget).y;
                    // y + widget.height - affectedY - (newPosition.y - y);
                    let offset = lastY - affectedY;
                    // move only the topmost widget in the column
                    affectedwidgets.add(affectedwidget.id);
                    utils.setupdate(affectedwidgets, this.moveSpaceDown(buffer, affectedwidget, offset));
                    break;
                }
            }
        }

        // Change Widget instance position (insert it)
        this._setPositionOn(buffer, widget, newPosition);

        this._reserveSpace(buffer, widget);

        // returns true when any widget position has been modified
        return affectedwidgets;
    };

    GridLayout.prototype._searchFreeSpace = function _searchFreeSpace(width, height) {
        var positionX = 0, positionY = 0;
        var maxX = this.columns - width;

        for (positionY = 0; true ; positionY++) {
            for (positionX = 0; positionX <= maxX; positionX++) {
                if (this._hasSpaceFor(this.matrix, positionX, positionY, width, height)) {
                    return {relx: true, x: positionX, rely: true, y: positionY};
                }
            }
        }
    };

    GridLayout.prototype.initialize = function initialize() {
        var widget, i, key, position, iWidgetsToReinsert = [];

        clearMatrix.call(this);

        // Insert iwidgets
        for (key in this.widgets) {
            widget = this.widgets[key];

            position = widget.position;

            widget.model.load();

            if (widget.shape.width > this.columns) {
                // TODO
                widget.setShape({width: this.columns});
            }

            if (widget.shape.width + position.x > this.columns) {
                iWidgetsToReinsert.push(widget);
            } else if (this._hasSpaceFor(this.matrix, position.x, position.y, widget.shape.width, widget.shape.height)) {
                this._reserveSpace(this._buffers.base, widget);
            } else {
                iWidgetsToReinsert.push(widget);
            }
        }

        var modified = false;
        if (iWidgetsToReinsert.length > 0) {
            // Reinsert the iwidgets that didn't fit in their positions
            for (i = 0; i < iWidgetsToReinsert.length; i++) {
                position = this._searchFreeSpace(
                    iWidgetsToReinsert[i].shape.width,
                    iWidgetsToReinsert[i].shape.height
                );
                iWidgetsToReinsert[i].setPosition(position);
                this._reserveSpace(this._buffers.base, iWidgetsToReinsert[i]);
            }
            modified = true;
        }

        this.initialized = true;
        return modified;
    };

    /**
     * Calculate what cell is at a given position in pixels
     */
    GridLayout.prototype.getCellAt = function getCellAt(x, y) {
        var columnWidth = this.getWidth() / this.columns;
        var rowHeight = this.getHeight() / this.rows;

        return new Wirecloud.DragboardPosition(Math.floor(x / columnWidth),
            Math.floor(y / rowHeight));
    };

    /**
     * Inserts the given widget into this layout.
     *
     * @param widget the widget to insert in this layout
     * @param affectsDragboard if true, the dragboard associated to this layout will be notified
     * @return whether any widget's position has been modified
     */
    GridLayout.prototype.addWidget = function addWidget(widget, affectsDragboard) {
        var affectedwidgets = new Set();

        Wirecloud.ui.DragboardLayout.prototype.addWidget.call(this, widget, affectsDragboard);

        if (!this.initialized) {
            return affectedwidgets;
        }

        if (widget.shape.width > this.columns) {
            widget.setShape({width: this.columns});
        }

        var position = widget.position;
        if (position) {
            var diff = widget.shape.width + position.x - this.columns;
            if (diff > 0) {
                position.x -= diff;
            }

            // Insert it. Returns if there are any affected widget
            affectedwidgets = this._insertAt(widget, position.x, position.y, this._buffers.base);
        } else {
            // Search a position for the widget
            position = this._searchFreeSpace(widget.shape.width, widget.shape.height);
            widget.setPosition(position);

            // Reserve the cells for the widget instance
            this._reserveSpace(this._buffers.base, widget);
        }

        this._adaptIWidget(widget);
        return affectedwidgets;
    };

    /**
     * @returns Returns a list of the widgets affected by the removing the indicated widget
     */
    GridLayout.prototype.removeWidget = function removeWidget(widget, affectsDragboard) {
        this._removeFromMatrix(this._buffers.base, widget);
        Wirecloud.ui.DragboardLayout.prototype.removeWidget.call(this, widget, affectsDragboard);
        return new Set();
    };

    GridLayout.prototype.moveTo = function moveTo(destLayout) {
        var movedWidgets, orderedWidgets, x, y, i, widget;

        /*
         * Always use GridLayout._removeFromMatrix for removing widgets
         * when moving widgets to another layout.
         */
        this._removeFromMatrix = GridLayout.prototype._removeFromMatrix;

        movedWidgets = {};
        orderedWidgets = [];
        for (y = 0; y < this.rows; y += 1) {
            for (x = 0; x < this.columns; x += 1) {
                var iwidget = this.matrix[x][y];
                if (iwidget != null && !(iwidget.id in movedWidgets)) {
                    orderedWidgets.push(iwidget);
                    movedWidgets[iwidget.id] = true;
                }
            }
        }

        for (i = 0; i < orderedWidgets.length; i += 1) {
            widget = orderedWidgets[i];
            widget.moveToLayout(destLayout);
        }

        /* Restore _removeFromMatrix */
        delete this._removeFromMatrix;
    };

    GridLayout.prototype._cloneMatrix = Wirecloud.ui.ColumnLayout.prototype._cloneMatrix;
    GridLayout.prototype._clonePositions = Wirecloud.ui.ColumnLayout.prototype._clonePositions;

    GridLayout.prototype.initializeMove = function initializeMove(widget, draggable) {

        if (!(widget instanceof Wirecloud.ui.WidgetView)) {
            throw new TypeError("widget must be an WidgetView instance");
        }

        // Check for pendings moves
        if (this.iwidgetToMove !== null) {
            let msg = "Dragboard: There was a pending move that was cancelled because initializedMove function was called before it was finished.";
            Wirecloud.GlobalLogManager.log(msg, Wirecloud.constants.LOGGING.WARN_MSG);
            this.cancelMove();
        }

        this.iwidgetToMove = widget;

        // Make a copy of the positions of the widgets
        this._buffers.backup = {
            matrix: this._cloneMatrix(this._buffers.base.matrix),
            positions: this._clonePositions(this._buffers.base)
        };
        this._buffers.shadow = {
            matrix: this.matrix
        };
        // Shadow matrix = current matrix without the widget to move
        // Initialize shadow matrix and searchInsertPointCache
        this._removeFromMatrix(this._buffers.backup, widget);

        // Create dragboard cursor
        this.dragboardCursor = new Wirecloud.ui.DragboardCursor(widget);

        draggable.setXOffset(this.fromHCellsToPixels(1) / 2);
        draggable.setYOffset(this.fromVCellsToPixels(1) / 2);
    };

    GridLayout.prototype._destroyCursor = function _destroyCursor() {
        if (this.dragboardCursor !== null) {
            this.dragboardCursor.destroy();
            this.dragboardCursor = null;
        }
    };

    GridLayout.prototype.disableCursor = function disableCursor() {
        this._destroyCursor();
    };

    GridLayout.prototype._setPositions = function _setPositions() {
        var key, curIWidget;

        for (key in this.widgets) {
            curIWidget = this.widgets[key];
            if (curIWidget !== this.iwidgetToMove) {
                curIWidget.setPosition(this._getPositionOn(this._buffers.shadow, curIWidget));
            }
        }

        this.dragboardCursor.setPosition(this._getPositionOn(this._buffers.shadow, this.dragboardCursor));
    };

    GridLayout.prototype.moveTemporally = function moveTemporally(x, y) {
        if (this.iwidgetToMove == null) {
            let msg = "Dragboard: You must call initializeMove function before calling to this function (moveTemporally).";
            Wirecloud.GlobalLogManager.log(msg, Wirecloud.constants.LOGGING.WARN_MSG);
            return;
        }

        let position = this.getCellAt(x, y);
        x = position.x;
        y = position.y;
        if (y < 0) {
            y = 0;
        }
        if (x < 0) {
            x = 0;
        } else {
            var maxX = this.columns - this.iwidgetToMove.shape.width;
            if (x > maxX) {
                x = maxX;
            }
        }

        if (this.dragboardCursor != null) {
            var cursorpos = this.dragboardCursor.position;

            if ((cursorpos.y !== y) || (cursorpos.x !== x)) {
                this._buffers.shadow.positions = this._clonePositions(this._buffers.backup);
                this._buffers.shadow.matrix = this._cloneMatrix(this._buffers.backup.matrix);

                // Change cursor position
                this._insertAt(this.dragboardCursor, x, y, this._buffers.shadow);
                this._setPositions();
            }
        } else {
            this._buffers.shadow.positions = this._clonePositions(this._buffers.backup);
            this._buffers.shadow.matrix = this._cloneMatrix(this._buffers.backup.matrix);

            this.dragboardCursor = new Wirecloud.ui.DragboardCursor(this.iwidgetToMove);
            this._insertAt(this.dragboardCursor, x, y, this._buffers.shadow);
        }
    };

    GridLayout.prototype.cancelMove = function cancelMove() {
        if (this.iwidgetToMove == null) {
            var msg = "Dragboard: Trying to cancel an inexistant temporal move.";
            Wirecloud.GlobalLogManager.log(msg, Wirecloud.constants.LOGGING.WARN_MSG);
            return;
        }

        this._destroyCursor();

        for (var key in this.widgets) {
            this.widgets[key].setPosition(this.widgets[key].position);
        }
        this.iwidgetToMove = null;
        this.dragboardCursor = null;
    };

    GridLayout.prototype.acceptMove = function acceptMove() {
        if (this.iwidgetToMove == null) {
            var msg = "Dragboard: Function acceptMove called when there is not an started iwidget move.";
            Wirecloud.GlobalLogManager.log(msg, Wirecloud.constants.LOGGING.WARN_MSG);
            return;
        }

        var oldposition = this.iwidgetToMove.position;
        var newposition = this.dragboardCursor.position;
        this._destroyCursor();

        // Needed to force repaint of the iwidget at the correct position
        this.iwidgetToMove.setPosition(newposition);

        // Update iwidgets positions in persistence
        if (oldposition.y !== newposition.y || oldposition.x !== newposition.x) {
            this.matrix = this._buffers.shadow.matrix;
            this._buffers.base.matrix = this.matrix;
            this._reserveSpace(this._buffers.base, this.iwidgetToMove);
            this.dragboard.update();
        }

        this.iwidgetToMove = null;
        this.dragboardCursor = null;
    };

    Wirecloud.ui.GridLayout = GridLayout;

})(Wirecloud.Utils);
