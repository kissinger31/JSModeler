FrameBufferRenderer = function ()
{
	this.canvas = null;
	this.content = null;
	this.shader = null;
	this.errors = null;
	this.scale = 1.0;
};

FrameBufferRenderer.prototype.Init = function (canvas, shader)
{
	this.errors = [];
	if (!this.InitWebGL (canvas)) {
		return false;
	}
	
	if (!this.InitShaders (shader)) {
		return false;
	}

	if (!this.InitBuffers ()) {
		return false;
	}

	if (this.errors.length !== 0) {
		return false;
	}
	return true;
};

FrameBufferRenderer.prototype.GetErrors = function ()
{
	return this.errors;
};

FrameBufferRenderer.prototype.InitWebGL = function (canvas)
{
	this.canvas = canvas;
	if (this.canvas === null) {
		return false;
	}
	
	if (this.canvas.getContext === undefined) {
		return false;
	}

	this.context = this.canvas.getContext ('webgl') || this.canvas.getContext ('experimental-webgl');
	if (this.context === null) {
		return false;
	}

	this.context.viewportWidth = this.canvas.width;
	this.context.viewportHeight = this.canvas.height;
	this.context.viewport (0, 0, this.context.viewportWidth, this.context.viewportHeight);
	this.context.clearColor (1.0, 1.0, 1.0, 1.0);
	return true;
};

FrameBufferRenderer.prototype.InitShaders = function (fragmentShader)
{
	function CompileShader (context, script, type, errors)
	{
		var shader = context.createShader (type);
		context.shaderSource (shader, script);
		context.compileShader (shader);
		if (!context.getShaderParameter (shader, context.COMPILE_STATUS)) {
			errors.push (context.getShaderInfoLog (shader));
			return null;
		}
		return shader;
	}
	
	function CreateShader (context, fragmentShaderScript, vertexShaderScript, errors)
	{
		var fragmentShader = CompileShader (context, fragmentShaderScript, context.FRAGMENT_SHADER, errors);
		var vertexShader = CompileShader (context, vertexShaderScript, context.VERTEX_SHADER, errors);
		if (fragmentShader === null || vertexShader === null) {
			return null;
		}

		var shader = context.createProgram ();
		context.attachShader (shader, vertexShader);
		context.attachShader (shader, fragmentShader);
		context.linkProgram (shader);
		if (!context.getProgramParameter (shader, context.LINK_STATUS)) {
			return null;
		}
		
		return shader;
	}
	
	var vertexShader = [
		'precision highp float;',
		'attribute vec2 aVertexPosition;',
		'varying vec2 vVertexPosition;',
		'void main (void) {',
		'	gl_Position = vec4 (aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);',
		'	vVertexPosition = aVertexPosition;',
		'}'
	].join('\n');
	
	this.shader = CreateShader (this.context, fragmentShader, vertexShader, this.errors);
	if (this.shader == null) {
		return false;
	}
	return true;
};

FrameBufferRenderer.prototype.InitBuffers = function ()
{
	this.shader.vertexAttribLocation = this.context.getAttribLocation (this.shader, 'aVertexPosition');
	this.shader.vertexScaleLocation = this.context.getUniformLocation (this.shader, 'uVertexScale');
	this.shader.widthLocation = this.context.getUniformLocation (this.shader, 'uWidth');
	this.shader.heightLocation = this.context.getUniformLocation (this.shader, 'uHeight');
	
	var vertices = new Float32Array ([-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]);
	var vertexBuffer = this.context.createBuffer ();
	
	this.context.enableVertexAttribArray (this.shader.vertexAttribLocation);
	this.context.bindBuffer (this.context.ARRAY_BUFFER, vertexBuffer);
	this.context.bufferData (this.context.ARRAY_BUFFER, vertices, this.context.STATIC_DRAW);
	this.context.vertexAttribPointer (this.shader.vertexAttribLocation, 2, this.context.FLOAT, false, 0, 0);
	return true;
};

FrameBufferRenderer.prototype.Render = function ()
{
	this.context.clear (this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT);
	this.context.useProgram (this.shader);
	this.context.uniform1f (this.shader.vertexScaleLocation, this.scale);
	this.context.uniform1f (this.shader.widthLocation, this.canvas.width);
	this.context.uniform1f (this.shader.heightLocation, this.canvas.height);
	this.context.drawArrays (this.context.TRIANGLE_FAN, 0, 4);
};
