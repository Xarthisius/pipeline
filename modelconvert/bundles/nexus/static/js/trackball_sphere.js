/**
 * Constructs a SphereTrackball object.
 * @class Interactor which implements a full spherical trackball controller.
 */
function SphereTrackball() {
}

SphereTrackball.prototype = {

	setup : function (options) {
		options = options || {};
		var opt = sglGetDefaultObject({
			startCenter   : [ 0.0, 0.0, 0.0 ],
			startDistance : 2.0,
			minMaxDist    : [0.2, 4.0],			
		}, options);
		
		this._action = SGL_TRACKBALL_NO_ACTION;
		this._new_action = true;

		// starting/default parameters
		this._startDistance = opt.startDistance;   			//distance

		// current parameters
		this._distance = this._startDistance;		
		
		//limits
		this._minMaxDist  = opt.minMaxDist;		
		
		this._matrix = SglMat4.identity();
		this._sphereMatrix = SglMat4.identity();		
		
		this._pts    = [ [0.0, 0.0], [0.0, 0.0] ];
	
		this.reset();
	},

    _computeMatrix: function() {
      var m = SglMat4.identity();  
	  
	  // zoom
	  m = SglMat4.mul(m, SglMat4.translation([0.0, 0.0, -this._distance]));
	  
	  // spheretrack
      m = SglMat4.mul(m, this._sphereMatrix);	  

      this._matrix = m;		
    },	
	
	_projectOnSphere : function(x, y) {
		var r = 1.0;

		var z = 0.0;
		var d = sglSqrt(x*x + y*y);
		if (d < (r * 0.70710678118654752440)) {
			/* Inside sphere */
			z = sglSqrt(r*r - d*d);
		}
		else {
			/* On hyperbola */
			t = r / 1.41421356237309504880;
			z = t*t / d;
		}
		return z;
	},

	_transform : function(m, x, y, z) {
		return SglMat4.mul4(m, [x, y, z, 0.0]);
	},

	_transformOnSphere : function(m, x, y) {
		var z = this._projectOnSphere(x, y);
		return this._transform(m, x, y, z);
	},

	_translate : function(offset, f) {
		var invMat = SglMat4.inverse(this._sphereMatrix);
		var t = SglVec3.to4(offset, 0.0);
		t = SglMat4.mul4(invMat, t);
		t = SglVec4.muls(t, f);
		var trMat = SglMat4.translation(t);
		this._sphereMatrix = SglMat4.mul(this._sphereMatrix, trMat);
	},

	getState : function () {
		return this._sphereMatrix;
	},

	setState : function (newstate) {
		this._sphereMatrix = newstate;
		this._computeMatrix();
	},
	
	animateToState : function (newstate) {
		this._sphereMatrix = newstate;
		this._computeMatrix();
	},
	
	get action()  { return this._action; },
	
	set action(a) { this._action = a },

	get matrix() { return this._matrix; },

	reset : function () {
		this._matrix = SglMat4.identity();
		this._sphereMatrix = SglMat4.identity();		
		
		this._distance = this._startDistance;		
		
		this._pts    = [ [0.0, 0.0], [0.0, 0.0] ];
		this._action = SGL_TRACKBALL_NO_ACTION;
		this._new_action = true;

		this._computeMatrix();
	},

	track : function(m, x, y, z) {
		this._pts[0][0] = this._pts[1][0];
		this._pts[0][1] = this._pts[1][1];
		this._pts[1][0] = x;
		this._pts[1][1] = y;

		switch (this._action) {
			case SGL_TRACKBALL_ROTATE:
				this.rotate(m);
			break;

			case SGL_TRACKBALL_PAN:
				this.pan(m);
			break;

			case SGL_TRACKBALL_DOLLY:
				this.dolly(m, z);
			break;

			case SGL_TRACKBALL_SCALE:
				this.scale(m, z);
			break;

			default:
			break;
		}
	},

	rotate : function(m) {
		if ((this._pts[0][0] == this._pts[1][0]) && (this._pts[0][1] == this._pts[1][1])) return;

		var mInv = SglMat4.inverse(m);

		var v0 = this._transformOnSphere(mInv, this._pts[0][0], this._pts[0][1]);
		var v1 = this._transformOnSphere(mInv, this._pts[1][0], this._pts[1][1]);
		var v1 = this._transformOnSphere(mInv, this._pts[1][0], this._pts[1][1]);
		var v1 = this._transformOnSphere(mInv, this._pts[1][0], this._pts[1][1]);

		var axis   = SglVec3.cross(v0, v1);
		var angle  = SglVec3.length(axis);
		var rotMat = SglMat4.rotationAngleAxis(angle, axis);

		this._sphereMatrix = SglMat4.mul(rotMat, this._sphereMatrix);
		this._computeMatrix();
	},

	pan : function(m) {
		var mInv = SglMat4.inverse(m);
		var v0 = this._transform(mInv, this._pts[0][0], this._pts[0][1], -1.0);
		var v1 = this._transform(mInv, this._pts[1][0], this._pts[1][1], -1.0);
		var offset = SglVec3.sub(v1, v0);
		this._translate(offset, 2.0);
		this._computeMatrix();
	},

	dolly : function(m, dz) {
		var mInv = SglMat4.inverse(m);
		var offset = this._transform(mInv, 0.0, 0.0, dz);
		this._translate(offset, 1.0);
		this._computeMatrix();
	},

	scale : function(m, s) {
		var scaleMat = SglMat4.scaling([s, s, s]);
		this._sphereMatrix = SglMat4.mul(scaleMat, this._sphereMatrix);
		this._computeMatrix();
	}
};
/***********************************************************************/
