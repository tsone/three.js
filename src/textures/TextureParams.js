/**
 * @author tsone / https://github.com/tsone/
 */

THREE.TextureParams = function ( options ) {

	options = options || {};

	this.mapping = options.mapping !== undefined ? options.mapping : THREE.TextureParams.DEFAULT_MAPPING;

	this.wrapS = options.wrapS !== undefined ? options.wrapS : THREE.ClampToEdgeWrapping;
	this.wrapT = options.wrapT !== undefined ? options.wrapT : THREE.ClampToEdgeWrapping;

	this.magFilter = options.magFilter !== undefined ? options.magFilter : THREE.LinearFilter;
	this.minFilter = options.minFilter !== undefined ? options.minFilter : THREE.LinearMipMapLinearFilter;

	this.anisotropy = options.anisotropy !== undefined ? options.anisotropy : 1;

	this.format = options.format !== undefined ? options.format : THREE.RGBAFormat;
	this.type = options.type !== undefined ? options.type : THREE.UnsignedByteType;

	this.offset = new THREE.Vector2( 0, 0 );
	this.repeat = new THREE.Vector2( 1, 1 );

	this.generateMipmaps = options.generateMipmaps !== undefined ? options.generateMipmaps : true;

};

THREE.TextureParams.prototype = {

	constructor: THREE.TextureParams,	

	clone: function ( texture ) {

		if ( texture === undefined ) texture = new THREE.TextureParams();

		THREE.TextureParams.call( texture, this );

		texture.offset.copy( this.offset );
		texture.repeat.copy( this.repeat );

		return texture;

	}

};

THREE.TextureParams.DEFAULT_MAPPING = THREE.UVMapping;
