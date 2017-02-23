// Process @[youtube](URL)
// Process @[vimeo](URL)
// Process @[youku](URL)
// Process @[qq](URL)


'use strict';

var yt_regex = /.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
function youtube_parser (url) {
  var match = url.match(yt_regex);
  return match && match[7].length === 11 ? match[7] : url;
}

/*eslint-disable max-len */
var vimeo_regex = /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
/*eslint-enable max-len */
function vimeo_parser (url) {
  var match = url.match(vimeo_regex);
  return match && typeof match[3] === 'string' ? match[3] : url;
}

var youku_regex = /https?:\/\/(?:v\.)?youku.com\/v_show\/id_([\w+]*(.*?)[\s]*)?.*/;
function youku_parser(url) {
  var match = url.match(youku_regex);
  return match && typeof match[1] === 'string' ? match[1] : url;
}

var qq_regex = /.*\.qq\.com(.*\/(?:cover|page|class|iframe)(?:\/.*)?(?:\/|vid=)([^#\&\?\/.]*)).*/;
function qq_parser(url) {
  var match = url.match(qq_regex);
  return match && typeof match[2] === 'string' ? match[2] : url;
}

var EMBED_REGEX = /@\[mbb_embed_([a-zA-Z].+)\]\([\s]*(.*?)[\s]*[\)]/im;

function video_embed(md, options) {
  function video_return(state, silent) {
    var serviceEnd,
      serviceStart,
      token,
      oldPos = state.pos;

    if (state.src.charCodeAt(oldPos) !== 0x40/* @ */ ||
        state.src.charCodeAt(oldPos + 1) !== 0x5B/* [ */) {
      return false;
    }

    var match = EMBED_REGEX.exec(state.src);
    if (!match || match.length < 3) {
      return false;
    }

    var service = match[1];
    var videoID = match[2];
    var serviceLower = service.toLowerCase();


    if (!options[serviceLower]) {
      return false;
    } else if (serviceLower === 'youtube') {
      videoID = youtube_parser(videoID);
    } else if (serviceLower === 'vimeo') {
      videoID = vimeo_parser(videoID);
    } else if (serviceLower === 'youku') {
      videoID = youku_parser(videoID);
    } else if (serviceLower === 'qq') {
      videoID = qq_parser(videoID);
    }

    // If the videoID field is empty, regex currently make it the close parenthesis.
    if (videoID === ')') {
      videoID = '';
    }

    serviceStart = oldPos + 2;
    serviceEnd = md.helpers.parseLinkLabel(state, oldPos + 1, false);

    //
    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //
    if (!silent) {
      state.pos = serviceStart;
      state.posMax = serviceEnd;
      state.service = state.src.slice(serviceStart, serviceEnd);
      var newState = new state.md.inline.State(service, state.md, state.env, []);
      newState.md.inline.tokenize(newState);

      token = state.push('video', '');
      token.videoID = videoID;
      token.service = service;
      token.level = state.level;
    }

    state.pos = state.pos + state.src.indexOf(')', state.pos);
    state.posMax = state.tokens.length;

    return true;
  }

  return video_return;
}

function video_url(service, videoID) {
  switch (service) {
    case 'youtube':
      return '//www.youtube.com/embed/' + videoID;
    case 'vimeo':
      return '//player.vimeo.com/video/' + videoID;
    case 'youku':
      return '//player.youku.com/embed/' + videoID;
    case 'qq':
      return '//v.qq.com/iframe/player.html?vid=' + videoID + '&tiny=0&auto=0';
    default:
      return '';
  }
}

function tokenize_video(md, options) {
  function tokenize_return(tokens, idx) {
    var videoID = md.utils.escapeHtml(tokens[idx].videoID);
    var service = md.utils.escapeHtml(tokens[idx].service).toLowerCase();
    return videoID === '' ? '' :
      '<div class="embed-responsive embed-responsive-16by9"><iframe class="embed-responsive-item" ' +
      'type="text/html" ' +
      'src="' + video_url(service, videoID, options) + '">' +
      '</iframe></div>';
  }
  return tokenize_return;
}

var defaults = {
  url: video_url,
  youtube: true,
  vimeo: true,
  youku: true,
  qq: true
};

module.exports = function video_plugin(md, options) {
  if (options) {
    Object.keys(defaults).forEach(function(key) {
      if (typeof options[key] === 'undefined') {
        options[key] = defaults[key];
      }
    });
  } else {
    options = defaults;
  }
  md.renderer.rules.video = tokenize_video(md, options);
  md.inline.ruler.before('emphasis', 'video', video_embed(md, options));
};
