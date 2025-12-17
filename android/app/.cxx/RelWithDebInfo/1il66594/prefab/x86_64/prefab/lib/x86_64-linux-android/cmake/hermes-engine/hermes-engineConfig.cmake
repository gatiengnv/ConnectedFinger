if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/gatiengenevois/.gradle/caches/8.13/transforms/352fe9a1af5567ea5b9c46d165b47ecf/transformed/hermes-android-0.82.0-release/prefab/modules/hermesvm/libs/android.x86_64/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/gatiengenevois/.gradle/caches/8.13/transforms/352fe9a1af5567ea5b9c46d165b47ecf/transformed/hermes-android-0.82.0-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

