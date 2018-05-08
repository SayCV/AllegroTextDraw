# -*- coding: UTF-8 -*-
# Copyright (c) 2018, Xycart
# License: MIT License

from __future__ import unicode_literals

import sys, os     # standard modules
import errno

try:
    import ezdxf
    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False

import subprocess
import ConvertPingYin

CADINFOS_DIR = '../CadInfos/Allegro17.0'
LIBRARYS_DIR = '../Library/Allegro'

def run(cmd, logfile):
    p = subprocess.Popen(cmd, shell=True, universal_newlines=True, stdout=logfile)
    result = p.wait()
    logfile.flush()
    return result

def create_dwg(filename, text, font='songti.ttf', width=0.8):
    def CreateDir(dirName):
        try:
            os.makedirs(dirName)
        except OSError as exception:
            if exception.errno != errno.EEXIST:
                raise
            else:
                pass
    
    CreateDir(os.path.dirname(filename))
    
    result = 0
    dwg = ezdxf.new(dxfversion='R2000')  # AutoCAD R2000 R2004 AC1024
    msp = dwg.modelspace()
    
    dwg.layers.remove('Defpoints')
    dwg.layers.remove('View Port')
    dwg.layers.new('TEXTLAYER', dxfattribs={'color': 2})
    # use set_pos() for proper TEXT alignment - the relations between halign, valign, insert and align_point are tricky.
    # Arial, default width factor of 0.8
    dwg.styles.new('atd_text_style', dxfattribs={'font': font, 'width': width})
    msp.add_text(text, dxfattribs={'style': 'atd_text_style', 'layer': 'TEXTLAYER'}).set_pos((0, 0), align='LEFT') # CENTER

    dwg.saveas(filename)

    # filename  = 'example1.dxf'
    expdxffn  = os.path.dirname(filename) +  '/' + os.path.basename(filename).split('.')[0] + ".exp.dxf"
    if True:
        cmd = ['qcad',
               '-no-gui', 
               '-autostart', 
               'dxf-exploding.js',
               filename,
               expdxffn]
        
        with open('dxf-exploding.log', 'w') as logfile:
            result = run(cmd, logfile)
    return result

def dxfGenerator(text):
    if not EZDXF_AVAILABLE:
        print("Plese install ezdxf: pip install ezdxf.")
        sys.exit(1)
    
    # text   = "博大精深"
    textpy = ConvertPingYin.CConvert().convert(text) # .replace('-','')
    # print textpy
    
    symbolname = textpy
    dxf_dstdir = LIBRARYS_DIR + '/atd-' + symbolname
    dxffn    = dxf_dstdir + "/atd-" + symbolname + ".dxf"
    expdxffn = os.path.dirname(dxffn) + '/' + os.path.basename(dxffn).split('.')[0] + ".exp.dxf"
    return create_dwg(dxffn, text)
    # create_dwg("example1.dxf", text, font, width)

if __name__ == '__main__':
    dxfGenerator(text   = "博大精深")
