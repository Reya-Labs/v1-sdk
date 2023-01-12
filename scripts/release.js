const fs = require("fs");
const execSync = require("child_process").execSync;
const packageJsonVersion = require('../package.json').version;

function getCommitHash() {
    try {
        return execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
        console.error(e);
        console.error('Cannot get the commit hash.');
        process.exit(1);
    }
}

function tsCompile() {
    try {
        console.log(`Compiling typescript code...`)
        return execSync('rm -rf ./dist; tsc -p tsconfig.dist.json');
    } catch (e) {
        console.error(e.stdout?.toString());
        console.error('Cannot compile typescript!');
        process.exit(1);
    }
}

function newSentryRelease(version) {
    try {
        console.log(`Creating sentry release: ${version}`)
        return execSync(`sentry-cli releases new ${version}`);
    } catch (e) {
        console.error(e);
        console.error('Cannot newSentryRelease!');
        process.exit(1);
    }
}

function finalizeSentryRelease(version) {
    try {
        console.log(`Finalizing sentry release: ${version}`)
        return execSync(`sentry-cli releases finalize ${version}`);
    } catch (e) {
        console.error(e);
        console.error('Cannot finalizeSentryRelease!');
        process.exit(1);
    }
}

function uploadSentrySourcemaps(version) {
    try {
        console.log(`Uploading source maps for sentry release: ${version}`)
        return execSync(`sentry-cli releases files ${version} upload-sourcemaps ./dist`);
    } catch (e) {
        console.error(e);
        console.error('Cannot uploadSentrySourcemaps!');
        process.exit(1);
    }
}

function replaceVersionInSentry(version) {
    try {
        const path = './src/init.ts';
        const file = fs.readFileSync(path).toString('utf8');
        fs.writeFileSync(path, file.replace('<VERSION>',version),{encoding:'utf8',flag:'w'})
        return file;
    } catch (e) {
        console.error(e);
        console.error('Cannot replaceVersionInSentry!');
        process.exit(1);
    }
}

function restoreOldFile(oldContent) {
    try {
        const path = './src/init.ts';
        fs.writeFileSync(path, oldContent,{encoding:'utf8',flag:'w'})
    } catch (e) {
        console.error(e);
        console.error('Cannot replaceVersionInSentry!');
        process.exit(1);
    }
}

function release() {
    if(!process.env.SENTRY_RELEASE) {
        tsCompile();
        return;
    }
    const version = `v1-sdk@${packageJsonVersion}-${getCommitHash()}`.trim();
    newSentryRelease(version);
    const oldContent = replaceVersionInSentry(version);
    tsCompile();
    uploadSentrySourcemaps(version);
    finalizeSentryRelease(version);
    restoreOldFile(oldContent);
}

release();