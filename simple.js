{
    // Copyright (C) 2015 Luca Filipozzi <luca.filipozzi@gmail.com>
    // success: 1,2,3,4,5*,8,9*,10*,11*,16,17* (* indicates one success in several failures)
    // failure: 6,7,12,13,14,15,18
    init: function(elevators, floors) {
        // first, extend objects with some handy functions
        elevators.enqueueDestination = function(destination) { // append to elevator having shortest queue
            _.min(elevators, function(elevator) {return _.size(elevator.destinationQueue)}).enqueueDestination(destination, false);
        };
        elevators.dequeueDestination = function(destination) {
            _.each(elevators, function(elevator) {elevator.dequeueDestination(destination, false)});
        };
        _.each(elevators, function(elevator) {
            elevator.buttonIsPressed = function(destination) {
                return _.contains(elevator.getPressedFloors(), destination);
            };
            elevator.buttonIsNotPressed = function(destination) {
                return !elevator.buttonIsPressed(destination);
            };
            elevator.hasRoom = function() {
                return elevator.loadFactor() <= 0.7;
            };
            elevator.dequeueDestination = function(destination, force) {
                if (force || elevator.buttonIsNotPressed(destination)) {
                    elevator.destinationQueue = _.without(elevator.destinationQueue, destination);
                    elevator.checkDestinationQueue();
                }
            };
            elevator.enqueueDestination = function(destination, force) {
                if (force || !_.contains(elevator.destinationQueue, destination)) {
                    elevator.goToFloor(destination, force);
                }
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
                elevator.dequeueDestination(destination, true);
                elevator.enqueueDestination(destination, true);
            });
            elevator.on("passing_floor", function(destination, direction) {
                if (elevator.buttonIsPressed(destination) || (floors[destination].buttonIsPressed(direction) && elevator.hasRoom())) {
                    elevators.dequeueDestination(destination);
                    elevator.enqueueDestination(destination, true);
                }
            });
            elevator.on("stopped_at_floor", function(destination) {
                elevator.goingUpIndicator(_.isEmpty(elevator.destinationQueue) || _.first(elevator.destinationQueue) > destination);
                elevator.goingDownIndicator(_.isEmpty(elevator.destinationQueue) || _.first(elevator.destinationQueue) < destination);
            });
        });
        _.each(floors, function(floor) {
            floor.on("up_button_pressed", function() {
                elevators.enqueueDestination(floor.floorNum());
            });
            floor.on("down_button_pressed", function() {
                elevators.enqueueDestination(floor.floorNum());
            });
        });
    },
    update: function(dt, elevators, floors) {
    }
}
