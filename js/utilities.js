(function(){
    'use strict';
    var MAX32 = 4294967296;
    window.ngAPI.parse = {
        /**
         * Returns a string a history entrys status
         * @param {object} hist history item object
         * @return {void}
         */
        historyStatus: function(hist) {
            if(hist.Status) {
                return hist.Status
                .toLowerCase()
                .split('/');
            }

            // < v13 compat
            if (hist.Kind === 'NZB') {
                switch(true) {
                    case hist.ParStatus === 'FAILURE':
                    case hist.UnpackStatus === 'FAILURE':
                    case hist.MoveStatus === 'FAILURE':
                    case hist.ScriptStatus === 'FAILURE':
                        return ['failure'];
                    case hist.ParStatus === 'MANUAL':
                        return ['damaged'];
                    case hist.ScriptStatus === 'UNKNOWN':
                        return ['unknown'];
                    case hist.ScriptStatus === 'SUCCESS':
                    case hist.UnpackStatus === 'SUCCESS':
                    case hist.ParStatus === 'SUCCESS':
                        return ['success'];
                    case hist.ParStatus === 'REPAIR_POSSIBLE':
                        return ['repairable'];
                    case hist.ParStatus === 'NONE':
                        return ['unknown'];
                }
            } else if (hist.Kind === 'URL') {
                switch (hist.UrlStatus) {
                    case 'SUCCESS': return ['success'];
                    case 'FAILURE': return ['failure'];
                    case 'UNKNOWN': return ['unknown'];
                }
            }
        },

        /**
         * function detectGroupStatus()
         * Returns a string representing current download status
         *
         * @param {object} group Group object
         * @return {string} Group status
         */
        groupStatus: function(group) {
            if(group.Status !== 'undefined') {
                return group.Status.toLowerCase();
            }

            // < v13 compat
            switch(true) {
                case typeof group.post !== 'undefined':
                    return 'postprocess';
                case group.ActiveDownloads > 0:
                    return 'downloading';
                case group.PausedSizeLo !== 0 &&
                     group.RemainingSizeLo === group.PausedSizeLo:
                    return 'paused';
            }
            return 'queued';
        },

        /**
         * bigNumber
         * Combines two 32-bit integers to a 64-bit Double
         * (may lose data with extreme sizes)
         *
         * @param  {integer} hi high-end int
         * @param  {integer} lo low-end int
         * @return {number}  Larger number
         */
        bigNumber: function(hi, lo) {
            return Number(hi * MAX32 + lo);
        },

        /**
         * function formatHRSize()
         * Formats an integer of seconds to a human readable string
         *
         * @param  {integer} bytes size in bytes
         * @return {string} Human readable representation of bytes
         */
        toHRDataSize: function(bytes) {
            var sizes = {
                    1: ['KiB', 0],
                    2: ['MiB', 1],
                    3: ['GiB', 2],
                    4: ['TiB', 2]
                },
                output = null;
            Object.keys(sizes).reverse().forEach( function(i) {
                if(!output && this >= Math.pow(1024, i)) {
                    var nmr = this / Math.pow(1024, i);
                    output = nmr.toFixed(nmr < 100 ? sizes[i][1] : 0) +
                             ' ' + sizes[i][0];
                }
            }.bind(bytes));
            return output !== null ? output : bytes + 'B';
        }
    };
})();
