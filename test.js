// settings
var physics_accuracy = 3;
mouse_influence = 20;
mouse_cut = 5;
gravity = 1200;
cloth_height = 25;
cloth_width = 40;
start_y = 30;
spacing = 4;
tear_distance = 80;

function resetCanvas() {
  // Remettre les valeurs des variables aux paramètres d'origine
  physics_accuracy = 4;
  mouse_influence = 10;
  mouse_cut = 5;
  gravity = 1200;
  cloth_height = 25;
  cloth_width = 40;
  start_y = 30;
  spacing = 5;
  tear_distance = 50;

  // Réinitialiser le canvas
  cloth = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  start();
}

// Get canvas and context
var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");

// Cloth variables
var cloth, boundsx, boundsy;

// Mouse interaction variables
var mouse = {
  down: false,
  button: 1,
  x: 0,
  y: 0,
  px: 0,
  py: 0,
};

// Point object
var Point = function (x, y) {
  this.x = x;
  this.y = y;
  this.px = x;
  this.py = y;
  this.vx = 0;
  this.vy = 0;
  this.pin_x = null;
  this.pin_y = null;

  this.constraints = [];
  this.image = null; // Image for each point
};

Point.prototype.update = function (delta) {
  if (mouse.down) {
    var diff_x = this.x - mouse.x,
      diff_y = this.y - mouse.y,
      dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

    if (mouse.button == 1) {
      if (dist < mouse_influence) {
        this.px = this.x - (mouse.x - mouse.px) * 1.8;
        this.py = this.y - (mouse.y - mouse.py) * 1.8;
      }
    } else if (dist < mouse_cut) this.constraints = [];
  }

  this.add_force(0, gravity);

  delta *= delta;
  var nx = this.x + (this.x - this.px) * 0.99 + (this.vx / 2) * delta;
  var ny = this.y + (this.y - this.py) * 0.99 + (this.vy / 2) * delta;

  this.px = this.x;
  this.py = this.y;

  this.x = nx;
  this.y = ny;

  this.vy = this.vx = 0;
};

Point.prototype.draw = function () {
  if (!this.constraints.length) return;

  var i = this.constraints.length;
  while (i--) this.constraints[i].draw();

  // Draw image
  if (this.image && (this.pin_x === null || this.pin_y === null)) {
    // Ajouter cette condition
    ctx.drawImage(
      this.image,
      this.x - this.image.width / 2,
      this.y - this.image.height / 2
    );
  }
};

Point.prototype.resolve_constraints = function () {
  if (this.pin_x != null && this.pin_y != null) {
    this.x = this.pin_x;
    this.y = this.pin_y;
    return;
  }

  var i = this.constraints.length;
  while (i--) this.constraints[i].resolve();

  this.x > boundsx
    ? (this.x = 2 * boundsx - this.x)
    : 1 > this.x && (this.x = 2 - this.x);
  this.y < 1
    ? (this.y = 2 - this.y)
    : this.y > boundsy && (this.y = 2 * boundsy - this.y);
};

Point.prototype.attach = function (point) {
  this.constraints.push(new Constraint(this, point));
};

Point.prototype.remove_constraint = function (constraint) {
  this.constraints.splice(this.constraints.indexOf(constraint), 1);
};

Point.prototype.add_force = function (x, y) {
  this.vx += x;
  this.vy += y;

  var round = 400;
  this.vx = ~~(this.vx * round) / round;
  this.vy = ~~(this.vy * round) / round;
};

Point.prototype.pin = function (pinx, piny) {
  this.pin_x = pinx;
  this.pin_y = piny;
};

// Constraint object
var Constraint = function (p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
  this.length = spacing;
};

Constraint.prototype.resolve = function () {
  var diff_x = this.p1.x - this.p2.x,
    diff_y = this.p1.y - this.p2.y,
    dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
    diff = (this.length - dist) / dist;

  if (dist > tear_distance) this.p1.remove_constraint(this);

  var px = diff_x * diff * 0.5;
  var py = diff_y * diff * 0.5;

  this.p1.x += px;
  this.p1.y += py;
  this.p2.x -= px;
  this.p2.y -= py;
};

Constraint.prototype.draw = function () {
  ctx.moveTo(this.p1.x, this.p1.y);
  ctx.lineTo(this.p2.x, this.p2.y);
};

// Cloth object
var Cloth = function () {
  this.points = [];

  var start_x = canvas.width / 2 - (cloth_width * spacing) / 2;

  for (var y = 0; y <= cloth_height; y++) {
    for (var x = 0; x <= cloth_width; x++) {
      var p = new Point(start_x + x * spacing, start_y + y * spacing);

      x != 0 && p.attach(this.points[this.points.length - 1]);
      y == 0 && p.pin(p.x, p.y);
      y != 0 && p.attach(this.points[x + (y - 1) * (cloth_width + 1)]);

      this.points.push(p);
    }
  }
};

Cloth.prototype.update = function () {
  var i = physics_accuracy;

  while (i--) {
    var p = this.points.length;
    while (p--) this.points[p].resolve_constraints();
  }

  i = this.points.length;
  while (i--) this.points[i].update(0.016);
};

Cloth.prototype.draw = function () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();

  var i = cloth.points.length;
  while (i--) cloth.points[i].draw();

  ctx.stroke();

  // Set the stroke style to transparent
  ctx.strokeStyle = "rgba(0, 0, 0, 1)";

  // Draw the cloth lines without stroke
  var i = cloth.points.length;
  while (i--) cloth.points[i].draw();

  // Restore the stroke style to its original value
  ctx.strokeStyle = "red";
};

function update() {
  cloth.update();
  cloth.draw();
  requestAnimationFrame(update);
}

function start() {
  // Move the declaration of start_x outside of the Cloth function
  var start_x = canvas.width / 2 - (cloth_width * spacing) / 2;
  canvas.onmousedown = function (e) {
    mouse.button = e.which;
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    var rect = canvas.getBoundingClientRect();
    (mouse.x = e.clientX - rect.left),
      (mouse.y = e.clientY - rect.top),
      (mouse.down = true);
    e.preventDefault();
  };

  canvas.onmouseup = function (e) {
    mouse.down = false;
    e.preventDefault();
  };

  canvas.onmousemove = function (e) {
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    var rect = canvas.getBoundingClientRect();
    (mouse.x = e.clientX - rect.left),
      (mouse.y = e.clientY - rect.top),
      e.preventDefault();
  };

  canvas.oncontextmenu = function (e) {
    e.preventDefault();
  };

  boundsx = canvas.width - 1;
  boundsy = canvas.height - 1;

  // Load image
  var image = new Image();
  image.onload = function () {
    // Create Cloth
    cloth = new Cloth();

    for (var i = 0; i < cloth.points.length; i++) {
      var point = cloth.points[i];

      // Calculate image coordinates for the point
      var squareWidth = image.width / cloth_width;
      var squareHeight = image.height / cloth_height;
      var squareX = Math.floor(((point.x - start_x) / spacing) * squareWidth);
      var squareY = Math.floor(((point.y - start_y) / spacing) * squareHeight);

      // Create a new canvas to hold the image square
      var tempCanvas = document.createElement("canvas");
      tempCanvas.width = squareWidth;
      tempCanvas.height = squareHeight;
      var tempCtx = tempCanvas.getContext("2d");

      // Draw the image square onto the temporary canvas
      tempCtx.drawImage(
        image,
        squareX,
        squareY,
        squareWidth,
        squareHeight,
        0,
        0,
        squareWidth,
        squareHeight
      );

      // Assign the temporary canvas as the image for the point
      point.image = tempCanvas;
    }

    update();
  };
  image.src = imageData;
}

window.onload = function () {
  canvas.width = 500;
  canvas.height = 300;

  start();
  resetCanvas();
};
