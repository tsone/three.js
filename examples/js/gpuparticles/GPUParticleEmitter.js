/**
 * @author tsone https://github.com/tsone/
 */

THREE.GPUParticleEmitter = function ( options ) {

	options = options || {};

	THREE.Object3D.call( this );
	this.type = 'GPUParticleEmitter';

	this.burstSize = options.burstSize !== undefined ? options.burstSize : 1;

};

THREE.GPUParticleEmitter.prototype = Object.create( THREE.Object3D.prototype );
THREE.GPUParticleEmitter.prototype.constructor = THREE.GPUParticleEmitter;
