{
    // Copyright (C) 2015 Luca Filipozzi <luca.filipozzi@gmail.com>
    // concept based on https://github.com/bgwines/elevator-saga
    init: function(elevators, floors) {
        // first, create factories for new objects (Request and Queue)
        var createRequest = function(floorNum, origin, direction) {
            var x = {floorNum:floorNum, origin:origin, direction:direction};
            return x;
        };
        var createQueue = function(elevator) {
            var x = [];
            var x.uid = _.uniqueId('queue_');
            x.index = function() {
                _.indexOf(_.pluck(elevator.queues, 'uid'), function(uid) {return _.isEqual(queue.uid, uid)});
            };
            x.enqueueRequest = function(request, force) {
                force = force || false;
                if (force || elevator.acceptanceFunctions[x.index()](request)) {
                    x.push(request);
                    if (elevator.goingUpIndicator()) {
                        x.sort(function(r1, r2) {return r1.floorNum - r2.floorNum}); // ascending
                    } else {
                        x.sort(function(r1, r2) {return r2.floorNum - r1.floorNum}); // descending
                    }
                    return true;
                }
                return false;
            };
            x.dequeueRequest = function(floorNum) {
                x = _.filter(x, function(request) {return request.floorNum != floorNum});
            };
            x.asDestinationQueue = function() {
                return _.pluck(x, 'floorNum');
            };
            x.asLoad = function () {
                return (x.index() + 1) * _.size(_.uniq(x.asDestinationQueue()));
            };
            return x;
        };

        // then, extend (existing) objects with some handy functions
        elevators.enqueueRequest = function(request) {
            _.min(elevators, function(elevator) {return elevator.costToEnqueueRequest(request)}).enqueueRequest(request);
        };
        _.each(elevators, function(elevator) {
            elevator.acceptanceFunctions = [];
            elevator.acceptanceFunction[0] = function(request) {
                if (request.direction == "up" && elevator.goingDownIndicator()) {
                    return false; // request is for UP but elevator is going DOWN
                }
                if (request.direction == "down" && elevator.goingUpIndicator()) {
                    return false; // request is for DOWN but elevator is going UP
                }
                if (elevator.currentFloor() == request.floorNum) { // NB: currentFloor is discretized
                    return _.isEmpty(elevator.getPressedFloors()); // so only allow if what FIXME
                }
                return request.direction == "up" ? elevator.currentFloor() < request.floorNum : elevator.currentFloor() > request.floorNum;
            };
            elevator.acceptanceFunction[1] = function(request) {
                return request.direction == "up" ? elevator.goingDownIndicator() : elevator.goingUpIndicator();
            };
            elevator.acceptanceFunction[2] = function(request) {
                return request.direction == "up" ? elevator.goingUpIndicator() : elevator.goingDownIndicator();
            };
            elevator.enqueueRequest = function(request) {
                _.some(elevator.queues, function(queue) {queue.enqueueRequest(request)});
                elevator.rotateQueues();
            };
            elevator.rotateQueues = function() {
                if (_.isEmpty(elevator.queues[0])) {
                    elevator.goingUpIndicator(!elevator.goingUpIndicator());
                    elevator.goingDownIndicator(!elevator.goingDownIndicator());
                    elevator.queues.shift();
                    _.each(elevator.queues, function(queue) {queue.reverse()});
                    elevator.queues.push(createQueue(elevator));
                }
                elevator.destinationQueue = elevator.queues[0].asDestinationQueue();
                elevator.checkDestinationQueue();
            };
            elevator.costToEnqueueRequest = function(request) {
                var currentLoad = 5 * elevator.loadFactor() + _.reduce(elevator.queues, function(sum, queue) {return sum + queue.asLoad()}, 0);
                var requestLoad = _.findIndex(_.map(elevator.acceptanceFunctions, function(f) {return f(request)}), true) + 1;
                var a = 1.5; // optimal choice
                return Math.pow(a, currentLoad + requestLoad) - Math.pow(a, currentLoad);
            };
        };

        // then, register event handlers (which make use of the handy functions from above)
        _.each(elevators, function(elevator) {
            elevator.on("floor_button_pressed", function(floorNum) {
                elevator.queues[0].enqueueRequest(createRequest(floorNum, "internal", null), true);
                elevator.rotateQueues();
            });
            elevator.on("stopped_at_floor", function(floorNum) {
                elevator.queues[0].dequeueRequest(floorNum);
                elevator.rotateQueues();
            });
        });
        _.each(floors, function(floor) {
            floor.on("up_button_pressed", function() {
                elevators.enqueueRequest(createRequest(floor.floorNum(), "external", "up"));
            });
            floor.on("down_button_pressed", function() {
                elevators.enqueueRequest(createRequest(floor.floorNum(), "external", "down"));
            });
        });

        // then, initialize
        _.each(elevators, function(elevator) {
            elevator.goingUpIndicator(true);
            elevator.goingDownIndicator(false);
            elevator.queues = [];
            _.each(_.range(3), function(x) {elevator.queues.push(createQueue(elevator))});
        });
    },
    update: function(dt, elevators, floors) {
    }
    // vim: set ts=4 sw=4 et ai si sm fdm=indent:
}
