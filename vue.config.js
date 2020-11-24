module.exports = {
    chainWebpack: config => {
        config.module
            .rule("raw")
            .test(/\.(frag|vert)$/)
            .use("raw-loader")
            .loader("raw-loader")
            .end()
    },
}
