/********************************************************************
*  HullSelectionView: show an image, on which a region (hull) 
*                     can be selected.
****/

define(["underscore", "backbone", "app/models/Hull", "app/views/BaseView"], function (_, Backbone, Hull, BaseView)
{ 
    var $document = $(document), mouse = { update: function(e) {this.x = e.pageX; this.y = e.pageY;}};

    var HullSelectionView = BaseView.extend(
    {
        name: "",
        image: undefined,
        view : 'hullselection',

        events:
        {
            "click img": "addPoint",
            "dblclick .point": "removePoint",
            "click #point_0": "closeHull",
            "mousedown.drag .point" : "movePoint",
            "change img" : "drawCoordinates"
        },
        initialize: function(data)
        {
            this.name = data.name;
            this.image = data.image;
            this.model = data.model;
        },
        addPoint: function(e)
        {
            var point = {
                "x": e.pageX  - $("ul.side-nav").width() - 20,
                "y": e.pageY  - $("nav").height() - 20 - 20
            };

            var mapPosition = $("#map img");
            var delta = {
                "x": mapPosition.position().left,
                "y": mapPosition.position().top
            };

            // If point is succesfully rendered, add it to collection
            if(this.renderPoint(point, delta))
            {
                // Add point to Hull model (relative to ratio)
                var widthRatio = this.image.width / mapPosition.width() ;
                var heightRatio = this.image.height / mapPosition.height();
                var coordinate = {
                    "x" : Math.round((point.x - delta.x) * widthRatio),
                    "y" : Math.round((point.y - delta.y) * heightRatio)
                };

                // Write coordinates to input field (format | and , seperated)
                this.model.addCoordinate(coordinate);
                this.writeCoordinates();
            }
        },
        renderPoint: function(point, delta)
        {
            if(!this.closed)
            {
                var point_id = $('.point').length;
                this.$el.append('<div class="point" id="point_' + point_id + '"></div>');

                $('#point_' + point_id).css('left', point.x + 'px');
                $('#point_' + point_id).css('top', point.y + 'px');

                // Add coordinate info, relative to map
                this.$el.append('<div class="info" id="info_' + point_id + '">('+(point.x - delta.x)+','+(point.y - delta.y)+')</div>');
                $('#info_' + point_id).css('left', point.x - 40 + 'px');
                $('#info_' + point_id).css('top', point.y - 35 + 'px');

                // Draw a line between new and previous point
                if(point_id > 0)
                {
                    var x1 = $('#point_' + (point_id - 1)).position().left;
                    var y1 = $('#point_' + (point_id - 1)).position().top;
                    var line = this.createLine(point_id, x1, y1, point.x, point.y);
                    this.$el.append(line);
                }

                return true;
            }
            return false;
        },
        removePoint: function(e)
        {
            var point = $(e.target);
            var point_id = parseInt(point.attr('id').split('point_')[1]);

            // remove lines that connect the point
            if($(".point").length < 4 && point_id != 0 ) return;

            if(point_id > 0)
            {
                var preLine = this.$el.find(".line[rel='"+(point_id)+"']");
            }
            else
            {
                var preLine = this.$el.find(".line[rel='"+($(".point").length)+"']");
            }
            preLine.remove();
            var postLine = this.$el.find(".line[rel='"+(point_id+1)+"']");
            postLine.remove();

            // remove actual point
            point.remove();
            // remove from model
            this.model.removeCoordinate(point_id);
            this.writeCoordinates();
            // remove label
            this.$el.find("#info_"+point_id).remove();

            // decrease point id, starting from next point
            var temp = point_id;
            for(temp++; temp <= $(".point").length; temp++)
            {
                this.$el.find("#point_"+temp).attr("id", "point_" + (temp-1));
                this.$el.find("#info_"+temp).attr("id", "info_" + (temp-1));
                this.$el.find(".line[rel='"+temp+"']").attr("rel", (temp-1));
            }

            // decrease number of last line (if closed, it should be there)
            if(this.closed)
            {
                this.$el.find(".line[rel='"+temp+"']").attr("rel", (temp-1));
            }

            if(point_id > 0)
            {
                var first = this.$el.find("#point_" + (point_id-1));
                var x1 = first.position().left;
                var y1 = first.position().top;

                if(point_id < $(".point").length)
                {
                    var second = this.$el.find("#point_"+point_id);
                }
                else if (point_id == $(".point").length && this.closed)
                {
                    var second = this.$el.find("#point_0");
                }
                var x2 = second.position().left;
                var y2 = second.position().top;

                var newLine = this.createLine(point_id, x1, y1, x2, y2);
                this.$el.append(newLine);
            }
            else
            {
                this.closed = false;
            }
        },
        movePoint: function(e)
        {
            var $elem = $(e.target);
            var self = this;
            mouse.update(e);

            if(!/^(relative|absolute)$/.test($elem.css('position')))
            {
                $elem.css('position', 'relative');
            }

            $document.bind('mousemove.drag', function(e)
            {
                var left = (parseInt($elem.css('left'))||0) + (e.pageX - mouse.x);
                var top = (parseInt($elem.css('top'))||0) +  (e.pageY - mouse.y);

                // move text info (point location)
                var mapPosition = $("#map img").position();
                var mapWidth = $("#map img").width();
                var mapHeight = $("#map img").height();

                // point can't be moved outside image window
                if(left - mapPosition.left < 0)
                    left = mapPosition.left;
                if(top - mapPosition.top < 0)
                    top = mapPosition.top;

                if(left > mapPosition.left + mapWidth)
                    left = mapPosition.left + mapWidth;
                if(top > mapPosition.top + mapHeight)
                    top = mapPosition.top + mapHeight;

                $elem.css({
                    left: left + "px",
                    top: top + "px"
                });

                var line_sm = parseInt($elem.attr('id').split('point_')[1],10);

                // Edit point in Hull model (relative to ratio)
                var mapPosition = $("#map img").position();
                var widthRatio = self.image.width / $("#map img").width() ;
                var heightRatio = self.image.height / $("#map img").height();
                var point = {
                    "x" : Math.round((left - mapPosition.left) * widthRatio),
                    "y" : Math.round((top - mapPosition.top) * heightRatio)
                };
                self.model.editCoordinate(line_sm, point);
                self.writeCoordinates();
        
                x2 = left;
                y2 = top;
                
                var $info = self.$el.find("#info_"+line_sm);

                $info.css({
                    left: left - 40 + "px",
                    top: top - 35 + "px"
                });

                $info.html('('+(left - mapPosition.left)+','+(top - mapPosition.top)+')');

                var x1 = undefined, y1 = undefined;
                if (line_sm == 0 && self.closed)
                {
                    var previousLine = $(".point").length;
                    x1 = $('#point_' + (previousLine - 1)).position().left;
                    y1 = $('#point_' + (previousLine - 1)).position().top;
                }
                else if (line_sm > 0)
                {
                    var previousLine = line_sm;
                    x1 = $('#point_' + (previousLine - 1)).position().left;
                    y1 = $('#point_' + (previousLine - 1)).position().top;
                }

                if(x1 != undefined && y1 != undefined)
                {
                    var length = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
                    var angle  = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                    var transform = 'rotate('+angle+'deg)';

                    $('.line[rel=' + previousLine + ']').css(
                    {
                        'position': 'absolute',
                        '-webkit-transform':  transform,
                        '-moz-transform':     transform,
                        'transform':          transform
                    }).width(length);
                }
                
                $('.line[rel=' + (line_sm + 1) + ']').css('top', top);
                $('.line[rel=' + (line_sm + 1) + ']').css('left', left);
            
                if ($('.point').length-1 == line_sm)
                {
                    var x1 = $('#point_0').position().left;
                    var y1 = $('#point_0').position().top;
                }
                else
                {
                    var x1 = $('#point_' + (line_sm + 1)).position().left;
                    var y1 = $('#point_' + (line_sm + 1)).position().top;
                }

                var length = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
                var angle  = Math.atan2(y1 - y2, x1 - x2) * 180 / Math.PI;
                var transform = 'rotate('+angle+'deg)';
        
                $('.line[rel=' + (line_sm + 1) + ']').css(
                {
                    'position': 'absolute',
                    '-webkit-transform':  transform,
                    '-moz-transform':     transform,
                    'transform':          transform
                })
                .width(length);
            
                mouse.update(e);
                e.preventDefault();
            });

            $document.one('mouseup.drag', function(e)
            {
                $document.unbind('mousemove.drag');
            });
        },
        closeHull: function(e)
        {
            var point_id = $('.point').length;
            if(point_id > 2)
            {
                var x1 = $('#point_' + (point_id - 1)).position().left;
                var y1 = $('#point_' + (point_id - 1)).position().top;

                var x2 = $('#point_0').position().left;
                var y2 = $('#point_0').position().top;

                var line = this.createLine(point_id, x1, y1, x2, y2);
                this.$el.append(line);
                $('#point_0').css("background-color", "#fff");
                this.closed = true;
            }
        },
        createLine: function(point_id, x1, y1, x2, y2)
        {
            var length = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
            var angle  = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            var transform = 'rotate('+angle+'deg)';

            var line = $('<div>')
                .addClass('line')
                .css({
                  'position': 'absolute',
                  '-webkit-transform':  transform,
                  '-moz-transform':     transform,
                  'transform':          transform
                })
                .attr('rel', point_id)
                .width(length)
                .offset({left: x1, top: y1});

            return line;
        },
        writeCoordinates: function()
        {
            var coordinateString = "";
            var coordinates = this.model.coordinates;
            for(var i = 0; i < coordinates.length; i++)
            {
                coordinateString += coordinates[i].x + "," + coordinates[i].y + "|";
            }
            coordinateString = coordinateString.substring(coordinateString.length-1,0);

            this.$el.find("input").val(coordinateString);
        },
        drawCoordinates: function()
        {
            var mapPosition = $("#map img");
            var delta = {
                "x": mapPosition.position().left,
                "y": mapPosition.position().top
            };

            // Add point to Hull model (relative to ratio)
            var widthRatio = this.image.width / mapPosition.width() ;
            var heightRatio = this.image.height / mapPosition.height();

            var coordinates = this.model.coordinates;
            for(var i = 0; i < coordinates.length; i++)
            {
                var point = {
                    "x": Math.round((coordinates[i].x/widthRatio)+delta.x), 
                    "y": Math.round((coordinates[i].y/heightRatio)+delta.y)
                };
                this.renderPoint(point, delta);
            }
            // close hull
            this.closeHull();
        },
        restore: function()
        {
            this.$el.find(".point").remove();
            this.$el.find(".info").remove();
            this.$el.find(".line").remove();
            this.closed = false;
            this.drawCoordinates();
        },
        render: function()
        {
            this.$el.html(this.template({
                "name": this.name,
                "image": this.image,
                "coordinates": this.model.coordinates,
            }));
            this.writeCoordinates();
            return this;
        }
    });

    return HullSelectionView;
});