// Copyright (C) 2015 Luca Filipozzi <luca.filipozzi@gmail.com>
{
    init: function(elevators, floors) {
        // first, extend objects with some handy functions
        elevators.enqueueDestination = function(destination, direction) { // append to elevator having shortest queue
            _.min(elevators, function(elevator) {return _.size(elevator.destinationQueue)}).appendDestination(destination);
        };
        _.each(elevators, function(elevator) {
            elevator.buttonIsPressed = function(destination) {
                return _.contains(elevator.getPressedFloors(), destination);
            };
            elevator.hasRoom = function() {
                return elevator.loadFactor() <= 0.7;
            };
            elevator.appendDestination = function(destination) { // if not in queue, append
                if (!_.contains(elevator.destinationQueue, destination)) {
                    elevator.goToFloor(destination);
                }
            };
            elevator.prependDestination = function(destination) { // remove from queue and prepend
                elevator.destinationQueue = _.without(elevator.destinationQueue, destination);
                elevator.goToFloor(destination, true);
            };
        });
        _.each(floors, function(floor) {
            floor.buttonIsPressed = function(direction) {
                return floor.buttonStates[direction] == "activated";
            };
        });

        // then, register event handlers (which make use of the handy functions from above)
        _.each(elevators, function(elevator) {
            elevator.on("floor_button_pressed", function(destination) {
                elevator.prependDestination(destination);
            });
            elevator.on("passing_floor", function(destination, direction) {
                if (elevator.buttonIsPressed(destination) || (floors[destination].buttonIsPressed(direction) && elevator.hasRoom())) {
                    elevator.prependDestination(destination);
                }
            });
            elevator.on("stopped_at_floor", function(destination) {
                elevator.goingUpIndicator(_.isEmpty(elevator.destinationQueue) || _.first(elevator.destinationQueue) > destination);
                elevator.goingDownIndicator(_.isEmpty(elevator.destinationQueue) || _.first(elevator.destinationQueue) < destination);
            });
        });
        _.each(floors, function(floor) {
            floor.on("up_button_pressed", function() {
                elevators.enqueueDestination(floor.floorNum(), "up");
            });
            floor.on("down_button_pressed", function() {
                elevators.enqueueDestination(floor.floorNum(), "down");
            });
        });
    },
    update: function(dt, elevators, floors) {
    }
}
