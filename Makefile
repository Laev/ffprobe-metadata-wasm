dist/ffprobe-metadata-wasm.js:
	mkdir -p dist && \
	emcc --bind \
	-O2 \
	-L/opt/ffmpeg/lib \
	-I/opt/ffmpeg/include/ \
	-s EXPORTED_RUNTIME_METHODS="[FS, cwrap, ccall, getValue, setValue, writeAsciiToMemory]" \
	-s INITIAL_MEMORY=268435456 \
	-lavcodec -lavformat -lavutil -lswresample -lswscale -lm \
	-o dist/ffprobe-metadata-wasm.js \
	src/ffprobe-wasm-wrapper.cpp
